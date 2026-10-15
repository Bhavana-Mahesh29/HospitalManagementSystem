package com.carepulse.hospital.model;

public class Patient extends User {
    private String dob;
    private String gender;
    private String bloodGroup;
    private String emergencyContact;

    public Patient() {
        super();
        this.role = UserRole.PATIENT;
    }

    public Patient(String id, String name, String email, String phone, String password,
                   String dob, String gender, String bloodGroup, String emergencyContact) {
        super(id, UserRole.PATIENT, name, email, phone, password);
        this.dob = dob;
        this.gender = gender;
        this.bloodGroup = bloodGroup;
        this.emergencyContact = emergencyContact;
    }

    public String getDob() { return dob; }
    public void setDob(String dob) { this.dob = dob; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }
}
