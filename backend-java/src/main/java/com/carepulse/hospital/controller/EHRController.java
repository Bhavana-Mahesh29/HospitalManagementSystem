package com.carepulse.hospital.controller;

import com.carepulse.hospital.model.Doctor;
import com.carepulse.hospital.model.EHRRecord;
import com.carepulse.hospital.model.UserRole;
import com.carepulse.hospital.model.UserSession;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import com.carepulse.hospital.service.AuthService;
import com.carepulse.hospital.service.EHRService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ehr")
public class EHRController {

    private final EHRService ehrService;
    private final AuthService authService;
    private final InMemoryHospitalDatabase db;

    public EHRController(EHRService ehrService, AuthService authService, InMemoryHospitalDatabase db) {
        this.ehrService = ehrService;
        this.authService = authService;
        this.db = db;
    }

    private UserSession extractSession(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new com.carepulse.hospital.exception.AuthenticationException("Authentication required");
        }
        return authService.validateSession(authHeader.substring(7));
    }

    @GetMapping("/patients/{patientId}/records")
    public ResponseEntity<Map<String, Object>> getPatientRecords(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("patientId") String patientId) {
        UserSession session = extractSession(authHeader);
        List<EHRRecord> records = ehrService.getPatientRecords(patientId, session.getUserId(), session.getRole());
        return ResponseEntity.ok(Map.of(
                "patientId", patientId,
                "totalRecords", records.size(),
                "records", records
        ));
    }

    @GetMapping("/records/{recordId}")
    public ResponseEntity<Map<String, Object>> getRecordById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("recordId") String recordId) {
        UserSession session = extractSession(authHeader);
        EHRRecord record = ehrService.getRecordById(recordId, session.getUserId(), session.getRole());
        return ResponseEntity.ok(Map.of("record", record));
    }

    @PostMapping("/patients/{patientId}/records")
    public ResponseEntity<Map<String, Object>> addRecord(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable("patientId") String patientId,
            @RequestBody Map<String, Object> body) {
        UserSession session = extractSession(authHeader);
        if (session.getRole() != UserRole.DOCTOR) {
            throw new com.carepulse.hospital.exception.AccessDeniedException("Only doctors can add medical records");
        }
        Doctor doctor = db.findDoctorById(session.getUserId())
                .orElseThrow(() -> new com.carepulse.hospital.exception.ResourceNotFoundException("Doctor not found"));

        EHRRecord record = ehrService.addClinicalRecord(
                patientId,
                doctor,
                (String) body.get("diagnosis"),
                (String) body.get("symptoms"),
                (String) body.get("treatment"),
                null,
                null,
                (String) body.get("notes"),
                (String) body.get("privacyLevel"),
                (String) body.get("appointmentId")
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "EHR record created successfully",
                "record", record
        ));
    }
}
