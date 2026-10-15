package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.AccessDeniedException;
import com.carepulse.hospital.exception.SlotConflictException;
import com.carepulse.hospital.exception.ValidationException;
import com.carepulse.hospital.model.Appointment;
import com.carepulse.hospital.model.AppointmentStatus;
import com.carepulse.hospital.model.Doctor;
import com.carepulse.hospital.model.UserRole;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JUnit 5: Appointment Service & Scheduling Tests")
public class AppointmentServiceTest {

    private InMemoryHospitalDatabase db;
    private AppointmentService appointmentService;

    @BeforeEach
    void setUp() {
        db = new InMemoryHospitalDatabase();
        appointmentService = new AppointmentService(db);
    }

    @Test
    @DisplayName("US-4: Patient can successfully book an open appointment slot")
    void testBookAppointmentSuccess() {
        String testDate = InMemoryHospitalDatabase.getRelativeDate(5);
        String testSlot = "11:15 AM";

        Appointment apt = appointmentService.bookAppointment(
                "pat_1", "doc_1", testDate, testSlot, "Routine cardiac checkup"
        );

        assertThat(apt).isNotNull();
        assertThat(apt.getId()).startsWith("apt_");
        assertThat(apt.getPatientName()).isEqualTo("Johnathan Doe");
        assertThat(apt.getDoctorName()).isEqualTo("Dr. Sarah Jenkins");
        assertThat(apt.getStatus()).isEqualTo(AppointmentStatus.SCHEDULED);
        assertThat(apt.getTimeSlot()).isEqualTo(testSlot);

        // Verify notification was sent
        assertThat(db.getNotifications()).isNotEmpty();
        assertThat(db.getNotifications().get(0).getTitle()).contains("Appointment Booking Confirmed");
    }

    @Test
    @DisplayName("US-4 Item 2: Double-booking the same doctor and slot throws SlotConflictException")
    void testPreventDoubleBookingConflict() {
        String testDate = InMemoryHospitalDatabase.getRelativeDate(3);
        String testSlot = "09:00 AM";

        // First patient books slot
        appointmentService.bookAppointment("pat_1", "doc_2", testDate, testSlot, "First booking");

        // Second patient attempts to book exact same slot
        assertThatThrownBy(() ->
                appointmentService.bookAppointment("pat_2", "doc_2", testDate, testSlot, "Second booking conflict")
        )
                .isInstanceOf(SlotConflictException.class)
                .hasMessageContaining("already booked");
    }

    @Test
    @DisplayName("US-5 Item 2: Cannot book an appointment on doctor's unavailable date")
    void testCannotBookOnDoctorUnavailableDate() {
        Doctor doctor = db.findDoctorById("doc_1").orElseThrow();
        String unavailableDate = doctor.getUnavailableDates().get(0);

        assertThatThrownBy(() ->
                appointmentService.bookAppointment("pat_1", "doc_1", unavailableDate, "02:00 PM", "Testing off day")
        )
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("unavailable");
    }

    @Test
    @DisplayName("US-6 Item 3: Late cancellation warning is triggered when less than 2 hours away")
    void testLateCancellationWarningLessThanTwoHours() {
        String today = InMemoryHospitalDatabase.getRelativeDate(0);

        // Pre-create appointment today with imminent time slot
        Appointment apt = new Appointment(
                "apt_imminent_test", "pat_1", "Johnathan Doe", "john@example.com", "555-1234",
                "doc_6", "Dr. Robert Vance", "General Medicine", today, "11:00 AM", "Urgent consultation"
        );
        db.getAppointments().add(0, apt);

        // Check late cancellation helper
        AppointmentService.LateCancellationResult preview = appointmentService.checkLateCancellation(today, "11:00 AM");
        assertThat(preview.isLate()).isTrue();

        // Cancel appointment
        Appointment cancelled = appointmentService.cancelAppointment(apt.getId(), "pat_1", UserRole.PATIENT, "Emergency conflict");
        assertThat(cancelled.getStatus()).isEqualTo(AppointmentStatus.CANCELLED);
        assertThat(cancelled.isLateCancellation()).isTrue();
    }

    @Test
    @DisplayName("US-6 Item 1: Timely cancellation frees slot without penalty")
    void testTimelyCancellationFreesSlotWithoutPenalty() {
        String futureDate = InMemoryHospitalDatabase.getRelativeDate(6);
        String timeSlot = "03:30 PM";

        Appointment apt = appointmentService.bookAppointment("pat_1", "doc_4", futureDate, timeSlot, "Consultation");

        // Cancelled well in advance (> 2 hours)
        Appointment cancelled = appointmentService.cancelAppointment(apt.getId(), "pat_1", UserRole.PATIENT, "Schedule resolved");

        assertThat(cancelled.getStatus()).isEqualTo(AppointmentStatus.CANCELLED);
        assertThat(cancelled.isLateCancellation()).isFalse();

        // Verify slot is now open again and can be booked by someone else!
        Appointment rebooked = appointmentService.bookAppointment("pat_2", "doc_4", futureDate, timeSlot, "New patient takes slot");
        assertThat(rebooked).isNotNull();
        assertThat(rebooked.getStatus()).isEqualTo(AppointmentStatus.SCHEDULED);
    }

    @Test
    @DisplayName("US-6 Item 2: Rescheduling an appointment releases old slot and books new slot")
    void testRescheduleAppointmentFreesPreviousSlot() {
        String originalDate = InMemoryHospitalDatabase.getRelativeDate(3);
        String originalSlot = "10:30 AM";
        String targetDate = InMemoryHospitalDatabase.getRelativeDate(5);
        String targetSlot = "02:45 PM";

        Appointment apt = appointmentService.bookAppointment("pat_1", "doc_5", originalDate, originalSlot, "Skin check");

        // Reschedule
        Appointment updated = appointmentService.rescheduleAppointment(
                apt.getId(), "pat_1", UserRole.PATIENT, targetDate, targetSlot
        );

        assertThat(updated.getDate()).isEqualTo(targetDate);
        assertThat(updated.getTimeSlot()).isEqualTo(targetSlot);

        // The original slot must now be completely free for another patient!
        Appointment freeSlotApt = appointmentService.bookAppointment(
                "pat_2", "doc_5", originalDate, originalSlot, "Claiming freed slot"
        );
        assertThat(freeSlotApt).isNotNull();
        assertThat(freeSlotApt.getStatus()).isEqualTo(AppointmentStatus.SCHEDULED);
    }

    @Test
    @DisplayName("Security: Patient cannot cancel another patient's appointment")
    void testUnauthorizedCancellationThrowsAccessDenied() {
        String testDate = InMemoryHospitalDatabase.getRelativeDate(4);
        Appointment apt = appointmentService.bookAppointment("pat_1", "doc_1", testDate, "09:45 AM", "Confidential");

        // pat_2 tries to cancel pat_1's appointment
        assertThatThrownBy(() ->
                appointmentService.cancelAppointment(apt.getId(), "pat_2", UserRole.PATIENT, "Malicious attempt")
        )
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Forbidden");
    }
}
