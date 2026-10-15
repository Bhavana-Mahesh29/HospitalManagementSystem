package com.carepulse.hospital.model;

import java.util.ArrayList;
import java.util.List;

public class Doctor extends User {
    private String department;
    private String qualification;
    private String room;
    private String avatarUrl;
    private String bio;
    private int experienceYears;
    private double consultationFee;
    private List<String> unavailableDates = new ArrayList<>();

    public Doctor() {
        super();
        this.role = UserRole.DOCTOR;
    }

    public Doctor(String id, String name, String email, String phone, String password,
                  String department, String qualification, String room, String avatarUrl,
                  String bio, int experienceYears, double consultationFee) {
        super(id, UserRole.DOCTOR, name, email, phone, password);
        this.department = department;
        this.qualification = qualification;
        this.room = room;
        this.avatarUrl = avatarUrl;
        this.bio = bio;
        this.experienceYears = experienceYears;
        this.consultationFee = consultationFee;
    }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public int getExperienceYears() { return experienceYears; }
    public void setExperienceYears(int experienceYears) { this.experienceYears = experienceYears; }

    public double getConsultationFee() { return consultationFee; }
    public void setConsultationFee(double consultationFee) { this.consultationFee = consultationFee; }

    public List<String> getUnavailableDates() { return unavailableDates; }
    public void setUnavailableDates(List<String> unavailableDates) { this.unavailableDates = unavailableDates; }

    public void addUnavailableDate(String dateStr) {
        if (!unavailableDates.contains(dateStr)) {
            unavailableDates.add(dateStr);
        }
    }

    public void removeUnavailableDate(String dateStr) {
        unavailableDates.remove(dateStr);
    }

    public boolean isDateUnavailable(String dateStr) {
        return unavailableDates.contains(dateStr);
    }
}
