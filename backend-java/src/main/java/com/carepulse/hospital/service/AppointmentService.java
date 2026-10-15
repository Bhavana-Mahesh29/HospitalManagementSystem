package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.AccessDeniedException;
import com.carepulse.hospital.exception.ResourceNotFoundException;
import com.carepulse.hospital.exception.SlotConflictException;
import com.carepulse.hospital.exception.ValidationException;
import com.carepulse.hospital.model.*;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private final InMemoryHospitalDatabase db;

    public AppointmentService(InMemoryHospitalDatabase db) {
        this.db = db;
    }

    public static class LateCancellationResult {
        private final boolean isLate;
        private final double hoursRemaining;
        private final String warning;

        public LateCancellationResult(boolean isLate, double hoursRemaining, String warning) {
            this.isLate = isLate;
            this.hoursRemaining = hoursRemaining;
            this.warning = warning;
        }

        public boolean isLate() { return isLate; }
        public double getHoursRemaining() { return hoursRemaining; }
        public String getWarning() { return warning; }
    }

    public LateCancellationResult checkLateCancellation(String dateStr, String timeSlotStr) {
        try {
            // e.g., "09:45 AM"
            String[] parts = timeSlotStr.split(" ");
            String[] timeParts = parts[0].split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            String ampm = parts[1];

            if (ampm.equalsIgnoreCase("PM") && hour < 12) hour += 12;
            if (ampm.equalsIgnoreCase("AM") && hour == 12) hour = 0;

            LocalDate aptDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
            LocalDateTime aptDateTime = LocalDateTime.of(aptDate, LocalTime.of(hour, minute));
            LocalDateTime now = LocalDateTime.now();

            long minutesRemaining = ChronoUnit.MINUTES.between(now, aptDateTime);
            double hoursRemaining = Math.max(0.0, minutesRemaining / 60.0);

            boolean isLate = hoursRemaining <= 2.0;
            String warning = isLate
                    ? String.format("Warning: Appointment is scheduled within %.1f hours (less than the 2-hour window). Late cancellation penalty applies.", hoursRemaining)
                    : null;

            return new LateCancellationResult(isLate, Math.round(hoursRemaining * 10.0) / 10.0, warning);
        } catch (Exception e) {
            return new LateCancellationResult(false, 99.0, null);
        }
    }

    public Appointment bookAppointment(String patientId, String doctorId, String date, String timeSlot, String notes) {
        if (patientId == null || doctorId == null || date == null || timeSlot == null) {
            throw new ValidationException("Patient ID, Doctor ID, date, and time slot are required.");
        }

        Patient patient = db.findPatientById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        Doctor doctor = db.findDoctorById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        // Check if doctor marked this day as unavailable
        if (doctor.isDateUnavailable(date)) {
            throw new ValidationException(String.format("Dr. %s is unavailable on %s.", doctor.getName(), date));
        }

        // Check for double booking conflict
        boolean conflict = db.getAppointments().stream()
                .filter(a -> a.getDoctorId().equals(doctorId))
                .filter(a -> a.getDate().equals(date))
                .filter(a -> a.getTimeSlot().equalsIgnoreCase(timeSlot))
                .anyMatch(a -> a.getStatus() == AppointmentStatus.SCHEDULED);

        if (conflict) {
            throw new SlotConflictException(String.format("Time slot %s on %s is already booked by another patient.", timeSlot, date));
        }

        String id = "apt_" + UUID.randomUUID().toString().substring(0, 8);
        Appointment apt = new Appointment(
                id, patient.getId(), patient.getName(), patient.getEmail(), patient.getPhone(),
                doctor.getId(), doctor.getName(), doctor.getDepartment(),
                date, timeSlot, notes != null ? notes : ""
        );

        db.getAppointments().add(0, apt);

        // Notification
        Notification notif = new Notification(
                "notif_" + UUID.randomUUID().toString().substring(0, 8),
                patient.getId(),
                "Appointment Booking Confirmed",
                String.format("Your appointment with %s on %s at %s has been confirmed.", doctor.getName(), date, timeSlot),
                "appointment_confirmed"
        );
        db.getNotifications().add(0, notif);

        return apt;
    }

    public Appointment cancelAppointment(String appointmentId, String requestingUserId, UserRole role, String reason) {
        Appointment apt = db.findAppointmentById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));

        // Authorization check
        if (role == UserRole.PATIENT && !apt.getPatientId().equals(requestingUserId)) {
            throw new AccessDeniedException("Forbidden: You can only cancel your own appointments.");
        }
        if (role == UserRole.DOCTOR && !apt.getDoctorId().equals(requestingUserId)) {
            throw new AccessDeniedException("Forbidden: You can only cancel appointments scheduled with you.");
        }

        if (apt.getStatus() == AppointmentStatus.CANCELLED) {
            throw new ValidationException("Appointment is already cancelled.");
        }

        LateCancellationResult lateCheck = checkLateCancellation(apt.getDate(), apt.getTimeSlot());
        apt.setStatus(AppointmentStatus.CANCELLED);
        apt.setCancellationReason(reason != null ? reason : "Cancelled by user");
        apt.setLateCancellation(lateCheck.isLate());

        // Notification
        String notifMsg = lateCheck.isLate()
                ? String.format("Your appointment with %s on %s at %s was cancelled with less than 2 hours notice.", apt.getDoctorName(), apt.getDate(), apt.getTimeSlot())
                : String.format("Your appointment with %s on %s at %s was successfully cancelled. Slot has been freed.", apt.getDoctorName(), apt.getDate(), apt.getTimeSlot());

        Notification notif = new Notification(
                "notif_" + UUID.randomUUID().toString().substring(0, 8),
                apt.getPatientId(),
                lateCheck.isLate() ? "Appointment Cancelled (Late Notice)" : "Appointment Cancelled",
                notifMsg,
                "appointment_cancelled"
        );
        db.getNotifications().add(0, notif);

        return apt;
    }

    public Appointment rescheduleAppointment(String appointmentId, String requestingUserId, UserRole role,
                                            String newDate, String newTimeSlot) {
        if (newDate == null || newTimeSlot == null) {
            throw new ValidationException("New date and new time slot are required.");
        }

        Appointment apt = db.findAppointmentById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));

        if (role == UserRole.PATIENT && !apt.getPatientId().equals(requestingUserId)) {
            throw new AccessDeniedException("Forbidden: You can only reschedule your own appointments.");
        }

        Doctor doctor = db.findDoctorById(apt.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found."));

        if (doctor.isDateUnavailable(newDate)) {
            throw new ValidationException(String.format("Dr. %s is unavailable on %s.", doctor.getName(), newDate));
        }

        // Check if destination slot is occupied
        boolean conflict = db.getAppointments().stream()
                .filter(a -> !a.getId().equals(appointmentId))
                .filter(a -> a.getDoctorId().equals(apt.getDoctorId()))
                .filter(a -> a.getDate().equals(newDate))
                .filter(a -> a.getTimeSlot().equalsIgnoreCase(newTimeSlot))
                .anyMatch(a -> a.getStatus() == AppointmentStatus.SCHEDULED);

        if (conflict) {
            throw new SlotConflictException(String.format("Slot %s on %s is already occupied.", newTimeSlot, newDate));
        }

        String oldDate = apt.getDate();
        String oldSlot = apt.getTimeSlot();

        apt.setDate(newDate);
        apt.setTimeSlot(newTimeSlot);
        apt.setStatus(AppointmentStatus.SCHEDULED);

        // Notification
        Notification notif = new Notification(
                "notif_" + UUID.randomUUID().toString().substring(0, 8),
                apt.getPatientId(),
                "Appointment Rescheduled",
                String.format("Rescheduled from %s %s to %s %s.", oldDate, oldSlot, newDate, newTimeSlot),
                "appointment_rescheduled"
        );
        db.getNotifications().add(0, notif);

        return apt;
    }

    public List<Appointment> getAppointmentsForUser(String userId, UserRole role) {
        if (role == UserRole.PATIENT) {
            return db.getAppointments().stream()
                    .filter(a -> a.getPatientId().equals(userId))
                    .collect(Collectors.toList());
        } else {
            return db.getAppointments().stream()
                    .filter(a -> a.getDoctorId().equals(userId))
                    .collect(Collectors.toList());
        }
    }
}
