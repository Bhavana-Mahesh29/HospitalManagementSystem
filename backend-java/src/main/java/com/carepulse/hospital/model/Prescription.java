package com.carepulse.hospital.model;

public class Prescription {
    private String medication;
    private String dosage;
    private String frequency;
    private String duration;

    public Prescription() {}

    public Prescription(String medication, String dosage, String frequency, String duration) {
        this.medication = medication;
        this.dosage = dosage;
        this.frequency = frequency;
        this.duration = duration;
    }

    public String getMedication() { return medication; }
    public void setMedication(String medication) { this.medication = medication; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }
}
