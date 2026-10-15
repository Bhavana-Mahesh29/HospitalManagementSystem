package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.ResourceNotFoundException;
import com.carepulse.hospital.model.Appointment;
import com.carepulse.hospital.model.AppointmentStatus;
import com.carepulse.hospital.model.Doctor;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DoctorService {

    private final InMemoryHospitalDatabase db;

    public DoctorService(InMemoryHospitalDatabase db) {
        this.db = db;
    }

    public List<Doctor> getAllDoctors(String department) {
        if (department == null || department.equalsIgnoreCase("All Departments") || department.trim().isEmpty()) {
            return new ArrayList<>(db.getDoctors());
        }
        return db.getDoctors().stream()
                .filter(d -> d.getDepartment().equalsIgnoreCase(department.trim()))
                .collect(Collectors.toList());
    }

    public Doctor getDoctorById(String doctorId) {
        return db.findDoctorById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with ID: " + doctorId));
    }

    public void setDateAvailability(String doctorId, String dateStr, boolean available) {
        Doctor doctor = getDoctorById(doctorId);
        if (available) {
            doctor.removeUnavailableDate(dateStr);
        } else {
            doctor.addUnavailableDate(dateStr);
        }
    }

    /**
     * Compute 7-day schedule with open vs booked slots
     */
    public Map<String, List<String>> getSevenDayAvailableSlots(String doctorId) {
        Doctor doctor = getDoctorById(doctorId);
        Map<String, List<String>> schedule = new LinkedHashMap<>();

        LocalDate today = LocalDate.now();
        for (int i = 0; i < 7; i++) {
            String dateStr = today.plusDays(i).format(DateTimeFormatter.ISO_LOCAL_DATE);

            if (doctor.isDateUnavailable(dateStr)) {
                // Doctor is off/unavailable on this date
                schedule.put(dateStr, Collections.emptyList());
                continue;
            }

            // Find booked appointments for this doctor on this date
            Set<String> bookedSlots = db.getAppointments().stream()
                    .filter(a -> a.getDoctorId().equals(doctorId))
                    .filter(a -> a.getDate().equals(dateStr))
                    .filter(a -> a.getStatus() == AppointmentStatus.SCHEDULED)
                    .map(Appointment::getTimeSlot)
                    .collect(Collectors.toSet());

            // Filter out booked slots
            List<String> openSlots = InMemoryHospitalDatabase.STANDARD_TIME_SLOTS.stream()
                    .filter(slot -> !bookedSlots.contains(slot))
                    .collect(Collectors.toList());

            schedule.put(dateStr, openSlots);
        }

        return schedule;
    }
}
