package com.carepulse.hospital.model;

public class Vitals {
    private String bloodPressure;
    private String heartRate;
    private String temperature;
    private String oxygenLevel;
    private String weight;

    public Vitals() {}

    public Vitals(String bloodPressure, String heartRate, String temperature, String oxygenLevel, String weight) {
        this.bloodPressure = bloodPressure;
        this.heartRate = heartRate;
        this.temperature = temperature;
        this.oxygenLevel = oxygenLevel;
        this.weight = weight;
    }

    public String getBloodPressure() { return bloodPressure; }
    public void setBloodPressure(String bloodPressure) { this.bloodPressure = bloodPressure; }

    public String getHeartRate() { return heartRate; }
    public void setHeartRate(String heartRate) { this.heartRate = heartRate; }

    public String getTemperature() { return temperature; }
    public void setTemperature(String temperature) { this.temperature = temperature; }

    public String getOxygenLevel() { return oxygenLevel; }
    public void setOxygenLevel(String oxygenLevel) { this.oxygenLevel = oxygenLevel; }

    public String getWeight() { return weight; }
    public void setWeight(String weight) { this.weight = weight; }
}
