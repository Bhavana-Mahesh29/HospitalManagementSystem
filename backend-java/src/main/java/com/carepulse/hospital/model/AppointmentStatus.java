package com.carepulse.hospital.model;

public enum AppointmentStatus {
    SCHEDULED("Scheduled"),
    COMPLETED("Completed"),
    CANCELLED("Cancelled");

    private final String display;

    AppointmentStatus(String display) {
        this.display = display;
    }

    public String getDisplay() {
        return display;
    }
}
