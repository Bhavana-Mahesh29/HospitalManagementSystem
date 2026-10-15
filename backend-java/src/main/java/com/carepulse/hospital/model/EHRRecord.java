package com.carepulse.hospital.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class EHRRecord {
    private String id;
    private String patientId;
    private String patientName;
    private String attendingDoctorId;
    private String attendingDoctorName;
    private String department;
    private Instant visitDate;
    private String diagnosis;
    private String symptoms;
    private String treatment;
    private List<Prescription> prescriptions = new ArrayList<>();
    private Vitals vitals;
    private String notes;
    private String privacyLevel; // "standard" or "private"
    private Instant createdAt;
    private Instant updatedAt;
    private String lastUpdatedByDoctorId;
    private String lastUpdatedByDoctorName;

    public EHRRecord() {
        this.privacyLevel = "standard";
        this.visitDate = Instant.now();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public EHRRecord(String id, String patientId, String patientName,
                     String attendingDoctorId, String attendingDoctorName,
                     String department, String diagnosis, String symptoms,
                     String treatment, String privacyLevel) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.attendingDoctorId = attendingDoctorId;
        this.attendingDoctorName = attendingDoctorName;
        this.department = department;
        this.diagnosis = diagnosis;
        this.symptoms = symptoms;
        this.treatment = treatment;
        this.privacyLevel = (privacyLevel != null && privacyLevel.equalsIgnoreCase("private")) ? "private" : "standard";
        this.visitDate = Instant.now();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.lastUpdatedByDoctorId = attendingDoctorId;
        this.lastUpdatedByDoctorName = attendingDoctorName;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getAttendingDoctorId() { return attendingDoctorId; }
    public void setAttendingDoctorId(String attendingDoctorId) { this.attendingDoctorId = attendingDoctorId; }

    public String getAttendingDoctorName() { return attendingDoctorName; }
    public void setAttendingDoctorName(String attendingDoctorName) { this.attendingDoctorName = attendingDoctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Instant getVisitDate() { return visitDate; }
    public void setVisitDate(Instant visitDate) { this.visitDate = visitDate; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public String getTreatment() { return treatment; }
    public void setTreatment(String treatment) { this.treatment = treatment; }

    public List<Prescription> getPrescriptions() { return prescriptions; }
    public void setPrescriptions(List<Prescription> prescriptions) { this.prescriptions = prescriptions; }

    public Vitals getVitals() { return vitals; }
    public void setVitals(Vitals vitals) { this.vitals = vitals; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getPrivacyLevel() { return privacyLevel; }
    public void setPrivacyLevel(String privacyLevel) { this.privacyLevel = privacyLevel; }

    public boolean isPrivate() { return "private".equalsIgnoreCase(this.privacyLevel); }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getLastUpdatedByDoctorId() { return lastUpdatedByDoctorId; }
    public void setLastUpdatedByDoctorId(String lastUpdatedByDoctorId) { this.lastUpdatedByDoctorId = lastUpdatedByDoctorId; }

    public String getLastUpdatedByDoctorName() { return lastUpdatedByDoctorName; }
    public void setLastUpdatedByDoctorName(String lastUpdatedByDoctorName) { this.lastUpdatedByDoctorName = lastUpdatedByDoctorName; }
}
