package com.carepulse.hospital.controller;

import com.carepulse.hospital.model.Doctor;
import com.carepulse.hospital.service.DoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDoctors(@RequestParam(value = "department", required = false) String department) {
        List<Doctor> doctors = doctorService.getAllDoctors(department);
        return ResponseEntity.ok(Map.of("doctors", doctors, "count", doctors.size()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDoctor(@PathVariable("id") String id) {
        Doctor doctor = doctorService.getDoctorById(id);
        return ResponseEntity.ok(Map.of("doctor", doctor));
    }

    @GetMapping("/{id}/schedule")
    public ResponseEntity<Map<String, Object>> getDoctorSchedule(@PathVariable("id") String id) {
        Doctor doctor = doctorService.getDoctorById(id);
        Map<String, List<String>> schedule = doctorService.getSevenDayAvailableSlots(id);
        return ResponseEntity.ok(Map.of(
                "doctorId", id,
                "doctorName", doctor.getName(),
                "department", doctor.getDepartment(),
                "schedule", schedule
        ));
    }

    @PostMapping("/{id}/availability")
    public ResponseEntity<Map<String, Object>> setAvailability(
            @PathVariable("id") String id,
            @RequestBody Map<String, Object> body) {
        String date = (String) body.get("date");
        Boolean available = (Boolean) body.get("available");
        doctorService.setDateAvailability(id, date, available != null ? available : true);
        return ResponseEntity.ok(Map.of(
                "message", "Availability updated",
                "date", date,
                "available", available
        ));
    }
}
