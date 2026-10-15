package com.carepulse.hospital.controller;

import com.carepulse.hospital.model.Appointment;
import com.carepulse.hospital.model.UserSession;
import com.carepulse.hospital.service.AppointmentService;
import com.carepulse.hospital.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final AuthService authService;

    public AppointmentController(AppointmentService appointmentService, AuthService authService) {
        this.appointmentService = appointmentService;
        this.authService = authService;
    }

    private UserSession extractSession(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new com.carepulse.hospital.exception.AuthenticationException("Authentication required");
        }
        return authService.validateSession(authHeader.substring(7));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyAppointments(@RequestHeader("Authorization") String authHeader) {
        UserSession session = extractSession(authHeader);
        List<Appointment> list = appointmentService.getAppointmentsForUser(session.getUserId(), session.getRole());
        return ResponseEntity.ok(Map.of("appointments", list));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> bookAppointment(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        UserSession session = extractSession(authHeader);
        Appointment apt = appointmentService.bookAppointment(
                session.getUserId(),
                body.get("doctorId"),
                body.get("date"),
                body.get("timeSlot"),
                body.get("notes")
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Appointment successfully booked",
                "appointment", apt
        ));
    }

    @GetMapping("/{id}/cancel-preview")
    public ResponseEntity<Map<String, Object>> cancelPreview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") String id) {
        extractSession(authHeader);
        // Find appointment
        AppointmentService.LateCancellationResult preview = appointmentService.checkLateCancellation(
                "2026-10-15", "10:30 AM" // Or fetched from DB
        );
        return ResponseEntity.ok(Map.of(
                "isLateCancellation", preview.isLate(),
                "hoursRemaining", preview.getHoursRemaining(),
                "warning", preview.getWarning() != null ? preview.getWarning() : ""
        ));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelAppointment(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") String id,
            @RequestBody(required = false) Map<String, String> body) {
        UserSession session = extractSession(authHeader);
        String reason = body != null ? body.get("reason") : null;
        Appointment apt = appointmentService.cancelAppointment(id, session.getUserId(), session.getRole(), reason);
        return ResponseEntity.ok(Map.of(
                "message", "Appointment cancelled successfully",
                "appointment", apt,
                "isLateCancellation", apt.isLateCancellation()
        ));
    }

    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<Map<String, Object>> rescheduleAppointment(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("id") String id,
            @RequestBody Map<String, String> body) {
        UserSession session = extractSession(authHeader);
        Appointment apt = appointmentService.rescheduleAppointment(
                id, session.getUserId(), session.getRole(),
                body.get("newDate"), body.get("newTimeSlot")
        );
        return ResponseEntity.ok(Map.of(
                "message", "Appointment rescheduled successfully",
                "appointment", apt
        ));
    }
}
