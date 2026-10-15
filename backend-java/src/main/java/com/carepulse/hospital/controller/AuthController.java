package com.carepulse.hospital.controller;

import com.carepulse.hospital.model.Patient;
import com.carepulse.hospital.model.UserRole;
import com.carepulse.hospital.model.UserSession;
import com.carepulse.hospital.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        Patient patient = authService.registerPatient(
                body.get("name"),
                body.get("email"),
                body.get("phone"),
                body.get("dob"),
                body.get("password"),
                body.get("gender"),
                body.get("bloodGroup"),
                body.get("emergencyContact")
        );

        UserSession session = authService.login(patient.getEmail(), body.get("password"), UserRole.PATIENT);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Patient registered successfully",
                "patient", patient,
                "token", session.getToken()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        String reqRole = body.get("requestedRole");
        UserRole role = reqRole != null ? UserRole.fromString(reqRole) : null;

        UserSession session = authService.login(email, password, role);

        return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "token", session.getToken(),
                "session", session
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
