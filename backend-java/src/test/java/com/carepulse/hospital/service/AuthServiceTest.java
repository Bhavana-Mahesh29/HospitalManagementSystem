package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.AccountLockedException;
import com.carepulse.hospital.exception.AuthenticationException;
import com.carepulse.hospital.exception.SessionExpiredException;
import com.carepulse.hospital.exception.ValidationException;
import com.carepulse.hospital.model.Patient;
import com.carepulse.hospital.model.UserRole;
import com.carepulse.hospital.model.UserSession;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JUnit 5: Authentication, Registration & Session Security Tests")
public class AuthServiceTest {

    private InMemoryHospitalDatabase db;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        db = new InMemoryHospitalDatabase();
        authService = new AuthService(db);
    }

    @Test
    @DisplayName("US-1: Patient registration succeeds with valid data")
    void testSuccessfulPatientRegistration() {
        Patient patient = authService.registerPatient(
                "Alice Wonder", "alice@example.com", "+1 555-888-9999",
                "1992-05-18", "SecurePass123!", "Female", "O-", "Bob (+1 555-888-0000)"
        );

        assertThat(patient).isNotNull();
        assertThat(patient.getId()).startsWith("pat_");
        assertThat(patient.getEmail()).isEqualTo("alice@example.com");
        assertThat(patient.getRole()).isEqualTo(UserRole.PATIENT);
    }

    @Test
    @DisplayName("US-1: Duplicate email registration is rejected")
    void testDuplicateEmailRegistrationFails() {
        assertThatThrownBy(() ->
                authService.registerPatient(
                        "Clone John", "john@example.com", "+1 555-901-2345",
                        "1988-06-14", "Password123!", "Male", "O+", "Jane Doe"
                )
        )
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    @DisplayName("Validation: Password less than 6 characters is rejected")
    void testShortPasswordValidation() {
        assertThatThrownBy(() ->
                authService.registerPatient(
                        "Shorty", "short@example.com", "555-0000",
                        "2000-01-01", "123", "Male", "A+", "None"
                )
        )
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("at least 6 characters");
    }

    @Test
    @DisplayName("US-2: Account is locked after 5 consecutive failed login attempts")
    void testAccountLockedAfterFiveConsecutiveFailedAttempts() {
        String email = "john@example.com";
        String wrongPassword = "WrongPassword999!";

        // 4 failed attempts should increment counter but not lock
        for (int i = 1; i <= 4; i++) {
            assertThatThrownBy(() -> authService.login(email, wrongPassword, UserRole.PATIENT))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Incorrect password");
        }

        // 5th attempt must trigger AccountLockedException (15-minute security lockout)
        assertThatThrownBy(() -> authService.login(email, wrongPassword, UserRole.PATIENT))
                .isInstanceOf(AccountLockedException.class)
                .hasMessageContaining("locked: 5 failed attempts reached");

        // Subsequent attempt with even correct password fails while locked
        assertThatThrownBy(() -> authService.login(email, "Password123!", UserRole.PATIENT))
                .isInstanceOf(AccountLockedException.class)
                .hasMessageContaining("temporarily locked for 15 minutes");
    }

    @Test
    @DisplayName("US-3 Item 2: Session expires after 15 minutes of idle inactivity")
    void testSessionExpiredAfterFifteenMinutesIdleTimeout() {
        UserSession session = authService.login("sarah.jenkins@hospital.org", "Password123!", UserRole.DOCTOR);
        assertThat(session).isNotNull();
        assertThat(session.getToken()).isNotEmpty();

        // Simulate 16 minutes of idle elapsed time
        session.setExpiresAt(Instant.now().minusSeconds(60)); // Expired 1 minute ago!

        // Validating the expired session should throw SessionExpiredException
        assertThatThrownBy(() -> authService.validateSession(session.getToken()))
                .isInstanceOf(SessionExpiredException.class)
                .hasMessageContaining("15-minute idle inactivity");
    }

    @Test
    @DisplayName("Security: Active user session touch refreshes expiration window")
    void testSessionTouchRefreshesExpiration() {
        UserSession session = authService.login("sarah.jenkins@hospital.org", "Password123!", UserRole.DOCTOR);
        Instant firstExpiry = session.getExpiresAt();

        // Validating the active session updates last active and returns session
        UserSession activeSession = authService.validateSession(session.getToken());
        assertThat(activeSession).isNotNull();
        assertThat(activeSession.getExpiresAt()).isAfterOrEqualTo(firstExpiry);
    }
}
