package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.AccountLockedException;
import com.carepulse.hospital.exception.AuthenticationException;
import com.carepulse.hospital.exception.SessionExpiredException;
import com.carepulse.hospital.exception.ValidationException;
import com.carepulse.hospital.model.Patient;
import com.carepulse.hospital.model.User;
import com.carepulse.hospital.model.UserRole;
import com.carepulse.hospital.model.UserSession;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private final InMemoryHospitalDatabase db;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    public AuthService(InMemoryHospitalDatabase db) {
        this.db = db;
    }

    public Patient registerPatient(String name, String email, String phone, String dob,
                                   String password, String gender, String bloodGroup,
                                   String emergencyContact) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("Full name is required.");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new ValidationException("Email address is required.");
        }
        if (phone == null || phone.trim().isEmpty()) {
            throw new ValidationException("Phone number is required.");
        }
        if (dob == null || dob.trim().isEmpty()) {
            throw new ValidationException("Date of birth is required.");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new ValidationException("Password is required.");
        }

        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new ValidationException("Invalid email format.");
        }

        if (password.length() < 6) {
            throw new ValidationException("Password must be at least 6 characters long.");
        }

        if (db.findUserByEmail(email).isPresent()) {
            throw new ValidationException("Email is already registered: " + email);
        }

        String id = "pat_" + UUID.randomUUID().toString().substring(0, 8);
        Patient patient = new Patient(id, name.trim(), email.trim().toLowerCase(),
                phone.trim(), password.trim(), dob.trim(),
                gender != null ? gender : "Unspecified",
                bloodGroup != null ? bloodGroup : "Unspecified",
                emergencyContact != null ? emergencyContact : "");

        db.getPatients().add(patient);
        return patient;
    }

    public UserSession login(String email, String password, UserRole expectedRole) {
        if (email == null || password == null) {
            throw new ValidationException("Email and password are required.");
        }

        User user = db.findUserByEmail(email)
                .orElseThrow(() -> new AuthenticationException("Invalid email or password."));

        // Check if locked
        if (user.isLocked()) {
            long remainingMinutes = Math.max(1, Duration.between(Instant.now(), user.getLockUntil()).toMinutes());
            throw new AccountLockedException("Account temporarily locked for 15 minutes due to 5 failed attempts.",
                    user.getLockUntil(), (int) remainingMinutes);
        }

        // Verify password
        if (!user.getPassword().equals(password)) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
                user.setLockUntil(Instant.now().plus(LOCK_DURATION));
                throw new AccountLockedException("Account locked: 5 failed attempts reached.",
                        user.getLockUntil(), 15);
            }
            int remaining = MAX_FAILED_ATTEMPTS - user.getFailedLoginAttempts();
            throw new AuthenticationException("Incorrect password. Attempts remaining: " + remaining);
        }

        // Check expected role
        if (expectedRole != null && user.getRole() != expectedRole) {
            throw new AuthenticationException("Role mismatch: account is registered as " + user.getRole());
        }

        // Reset failed attempts on success
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);

        // Generate session
        String token = "sess_" + user.getRole().getValue() + "_" + UUID.randomUUID().toString();
        UserSession session = new UserSession(token, user.getId(), user.getRole(), user.getEmail(), user.getName());
        db.getSessions().put(token, session);

        return session;
    }

    public UserSession validateSession(String token) {
        if (token == null || !db.getSessions().containsKey(token)) {
            throw new AuthenticationException("Invalid or missing session token.");
        }

        UserSession session = db.getSessions().get(token);
        if (session.isExpired()) {
            db.getSessions().remove(token);
            throw new SessionExpiredException("Session expired due to 15-minute idle inactivity.");
        }

        session.touch();
        return session;
    }

    public void logout(String token) {
        if (token != null) {
            db.getSessions().remove(token);
        }
    }
}
