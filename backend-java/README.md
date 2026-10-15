# CarePulse Hospital Management System - Java & JUnit 5 Backend

Production-grade Spring Boot 3 & JUnit 5 backend implementation for the Hospital Management System, matching all clinical EHR, appointment scheduling, and security requirements.

## 📁 Architecture Overview

```
backend-java/
├── pom.xml                                       # Maven configuration (Spring Boot 3.2.4, Java 17+, JUnit 5)
├── README.md                                     # This documentation
└── src/
    ├── main/java/com/carepulse/hospital/
    │   ├── HospitalApplication.java             # Spring Boot Main Application Entry Point
    │   ├── model/
    │   │   ├── User.java                         # Base user with 5-attempt security lockout
    │   │   ├── Patient.java                      # Patient profile & medical demographics
    │   │   ├── Doctor.java                       # Physician specialty, room, and blackout dates
    │   │   ├── Appointment.java                  # Clinical bookings with conflict & late-cancel flags
    │   │   ├── EHRRecord.java                    # Medical history, diagnoses, vitals, privacy levels
    │   │   ├── Prescription.java                 # Pharmacotherapy dosage & regimen
    │   │   ├── Vitals.java                       # Biometric observations (BP, HR, SpO2, Temp)
    │   │   ├── Notification.java                 # In-app patient alert dispatches
    │   │   └── UserSession.java                  # 15-minute idle inactivity timeout session
    │   ├── repository/
    │   │   └── InMemoryHospitalDatabase.java     # Thread-safe in-memory database with realistic seed data
    │   ├── service/
    │   │   ├── AuthService.java                  # Registration, lockout after 5 attempts, 15m idle session
    │   │   ├── DoctorService.java                # 7-day rolling window slot availability & blackout dates
    │   │   ├── AppointmentService.java           # Conflict detection, reschedule & <2hr cancellation rule
    │   │   └── EHRService.java                   # Chronological records, physician attribution, privacy RBAC
    │   └── controller/
    │       ├── AuthController.java               # REST: /api/auth (register, login, logout)
    │       ├── DoctorController.java             # REST: /api/doctors (directory, 7-day schedule, days off)
    │       ├── AppointmentController.java        # REST: /api/appointments (book, cancel, reschedule)
    │       ├── EHRController.java                # REST: /api/ehr (records, notes, access control)
    │       └── GlobalExceptionHandler.java       # Standardized JSON error response formatting
    └── test/java/com/carepulse/hospital/
        └── service/
            ├── AppointmentServiceTest.java       # 7 JUnit 5 tests: booking, conflicts, late cancel, reschedule
            ├── EHRServiceTest.java               # 6 JUnit 5 tests: chronological EHR, private records RBAC, attribution
            ├── AuthServiceTest.java              # 6 JUnit 5 tests: registration, 5-attempt lockout, 15m idle session
            └── DoctorAvailabilityTest.java       # 4 JUnit 5 tests: 7-day availability, blackout days, slot exclusion
```

## 🧪 Running the JUnit 5 Tests

To execute the complete JUnit 5 test suite with Maven:

```bash
mvn test
```

To run a specific test suite:

```bash
mvn test -Dtest=AppointmentServiceTest
mvn test -Dtest=EHRServiceTest
mvn test -Dtest=AuthServiceTest
mvn test -Dtest=DoctorAvailabilityTest
```

## 🚀 Running the Java Spring Boot Backend

To launch the Spring Boot REST API:

```bash
mvn spring-boot:run
```

The application starts on port `8080` (or configured `server.port`) with all REST API endpoints mapped to `/api/*`.

## 📋 Requirement Traceability to JUnit Tests

| Requirement | JUnit Test Case | Verification Logic |
|-------------|-----------------|--------------------|
| **US-1: Patient Registration** | `AuthServiceTest#testSuccessfulPatientRegistration` | Validates required fields, email format, password >= 6 chars, and duplicate prevention. |
| **US-2: 5-Attempt Lockout** | `AuthServiceTest#testAccountLockedAfterFiveConsecutiveFailedAttempts` | Verifies that on 5 consecutive failed logins, `AccountLockedException` is thrown and account is locked for 15 minutes. |
| **US-3: 15-Minute Idle Timeout** | `AuthServiceTest#testSessionExpiredAfterFifteenMinutesIdleTimeout` | Verifies session expires when idle for > 15 minutes. |
| **US-3: Doctor Private EHR Access** | `EHRServiceTest#testDoctorAccessToAnotherDoctorsPrivateRecordStrictlyDenied` | Verifies `AccessDeniedException` is thrown when a doctor attempts to access another doctor's private patient record. |
| **US-4: Booking Conflict Prevention** | `AppointmentServiceTest#testPreventDoubleBookingConflict` | Verifies `SlotConflictException` when 2 patients attempt to book the same doctor & slot. |
| **US-5: 7-Day Doctor Availability** | `DoctorAvailabilityTest#testSevenDaySlotGeneration` | Verifies rolling 7-day consultation slots and exclusion of booked or unavailable days. |
| **US-6: < 2 Hours Late Cancellation** | `AppointmentServiceTest#testLateCancellationWarningLessThanTwoHours` | Verifies that cancellation within 2 hours flags `isLateCancellation = true` with warning notice. |
| **US-6: Reschedule Slot Release** | `AppointmentServiceTest#testRescheduleAppointmentFreesPreviousSlot` | Verifies rescheduling updates to new slot and immediately frees the prior slot for other patients. |
| **US-7: EHR Chronological & Attribution** | `EHRServiceTest#testAddClinicalRecordTimestampsAndAttributesDoctor` | Verifies clinical notes are timestamped and attributed to attending doctor. |
