package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.AccessDeniedException;
import com.carepulse.hospital.exception.ResourceNotFoundException;
import com.carepulse.hospital.exception.ValidationException;
import com.carepulse.hospital.model.*;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EHRService {

    private final InMemoryHospitalDatabase db;

    public EHRService(InMemoryHospitalDatabase db) {
        this.db = db;
    }

    public List<EHRRecord> getPatientRecords(String patientId, String requestingUserId, UserRole role) {
        if (role == UserRole.PATIENT && !requestingUserId.equals(patientId)) {
            throw new AccessDeniedException("Access Denied: You can only view your own medical records.");
        }

        // Get and sort chronological (most recent first)
        List<EHRRecord> records = db.getEhrRecords().stream()
                .filter(r -> r.getPatientId().equals(patientId))
                .sorted((a, b) -> b.getVisitDate().compareTo(a.getVisitDate()))
                .collect(Collectors.toList());

        return records;
    }

    public EHRRecord getRecordById(String recordId, String requestingUserId, UserRole role) {
        EHRRecord record = db.findEHRRecordById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("EHR Record not found: " + recordId));

        // 1. Patient check
        if (role == UserRole.PATIENT) {
            if (!record.getPatientId().equals(requestingUserId)) {
                throw new AccessDeniedException("Access Denied: You cannot view records of other patients.");
            }
            return record;
        }

        // 2. Doctor check (US-3 Item 3: Access control on private records)
        if (role == UserRole.DOCTOR) {
            if (record.isPrivate() && !record.getAttendingDoctorId().equals(requestingUserId)) {
                throw new AccessDeniedException(String.format(
                        "Access Denied: Record %s is marked PRIVATE and is exclusively restricted to %s.",
                        recordId, record.getAttendingDoctorName()
                ));
            }
        }

        return record;
    }

    public EHRRecord addClinicalRecord(String patientId, Doctor doctor, String diagnosis,
                                       String symptoms, String treatment,
                                       List<Prescription> prescriptions, Vitals vitals,
                                       String notes, String privacyLevel, String appointmentId) {
        if (diagnosis == null || diagnosis.trim().isEmpty()) {
            throw new ValidationException("Diagnosis notes are required.");
        }

        Patient patient = db.findPatientById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        String id = "ehr_rec_" + UUID.randomUUID().toString().substring(0, 8);
        EHRRecord record = new EHRRecord(
                id, patient.getId(), patient.getName(),
                doctor.getId(), doctor.getName(), doctor.getDepartment(),
                diagnosis.trim(), symptoms != null ? symptoms.trim() : "",
                treatment != null ? treatment.trim() : "",
                privacyLevel
        );

        if (prescriptions != null) {
            record.setPrescriptions(new ArrayList<>(prescriptions));
        }
        if (vitals != null) {
            record.setVitals(vitals);
        } else {
            record.setVitals(new Vitals("120/80 mmHg", "72 bpm", "98.6 °F", "99%", "70 kg"));
        }
        record.setNotes(notes != null ? notes.trim() : "");
        record.setLastUpdatedByDoctorId(doctor.getId());
        record.setLastUpdatedByDoctorName(doctor.getName());
        record.setUpdatedAt(Instant.now());

        db.getEhrRecords().add(0, record);

        // If appointment linked, complete it
        if (appointmentId != null) {
            db.findAppointmentById(appointmentId).ifPresent(a -> a.setStatus(AppointmentStatus.COMPLETED));
        }

        // Send notification to patient
        Notification notif = new Notification(
                "notif_" + UUID.randomUUID().toString().substring(0, 8),
                patient.getId(),
                "New Clinical Record Added",
                String.format("%s added new consultation notes and treatment plan.", doctor.getName()),
                "ehr_updated"
        );
        db.getNotifications().add(0, notif);

        return record;
    }

    public EHRRecord updateClinicalRecord(String recordId, Doctor doctor, String diagnosis,
                                          String symptoms, String treatment,
                                          List<Prescription> prescriptions, Vitals vitals,
                                          String notes, String privacyLevel) {
        EHRRecord record = db.findEHRRecordById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("EHR Record not found: " + recordId));

        // Check if private record of another doctor
        if (record.isPrivate() && !record.getAttendingDoctorId().equals(doctor.getId())) {
            throw new AccessDeniedException(String.format(
                    "Access Denied: You cannot update a private record authored by %s.",
                    record.getAttendingDoctorName()
            ));
        }

        if (diagnosis != null) record.setDiagnosis(diagnosis.trim());
        if (symptoms != null) record.setSymptoms(symptoms.trim());
        if (treatment != null) record.setTreatment(treatment.trim());
        if (prescriptions != null) record.setPrescriptions(new ArrayList<>(prescriptions));
        if (vitals != null) record.setVitals(vitals);
        if (notes != null) record.setNotes(notes.trim());
        if (privacyLevel != null) record.setPrivacyLevel(privacyLevel);

        // Attribution and timestamping
        record.setUpdatedAt(Instant.now());
        record.setLastUpdatedByDoctorId(doctor.getId());
        record.setLastUpdatedByDoctorName(doctor.getName());

        return record;
    }
}
