package com.carepulse.hospital.service;

import com.carepulse.hospital.model.Doctor;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JUnit 5: Doctor 7-Day Availability & Scheduling Tests")
public class DoctorAvailabilityTest {

    private InMemoryHospitalDatabase db;
    private DoctorService doctorService;

    @BeforeEach
    void setUp() {
        db = new InMemoryHospitalDatabase();
        doctorService = new DoctorService(db);
    }

    @Test
    @DisplayName("US-5 Item 1: Doctor 7-day schedule returns daily time slots")
    void testSevenDaySlotGeneration() {
        Map<String, List<String>> schedule = doctorService.getSevenDayAvailableSlots("doc_2");

        assertThat(schedule).hasSize(7);
        // Dr. Marcus Chen (doc_2) has no unavailable dates, should have all 8 slots each day
        for (Map.Entry<String, List<String>> entry : schedule.entrySet()) {
            assertThat(entry.getValue()).isNotEmpty();
        }
    }

    @Test
    @DisplayName("US-5 Item 2: Unavailable dates return 0 available slots")
    void testUnavailableDateHasZeroSlots() {
        Doctor doctor = db.findDoctorById("doc_1").orElseThrow();
        String unavailableDate = doctor.getUnavailableDates().get(0); // Day + 2

        Map<String, List<String>> schedule = doctorService.getSevenDayAvailableSlots("doc_1");
        assertThat(schedule.get(unavailableDate)).isEmpty();
    }

    @Test
    @DisplayName("US-4 Item 2: Booked slot is excluded from available slots")
    void testBookedSlotExcludedFromAvailability() {
        String tomorrow = InMemoryHospitalDatabase.getRelativeDate(1);
        // Pre-seeded: Emily Parker booked Dr. Sarah Jenkins tomorrow at 10:30 AM
        Map<String, List<String>> schedule = doctorService.getSevenDayAvailableSlots("doc_1");
        List<String> tomorrowSlots = schedule.get(tomorrow);

        assertThat(tomorrowSlots).doesNotContain("10:30 AM");
        assertThat(tomorrowSlots).contains("09:00 AM", "09:45 AM", "11:15 AM");
    }

    @Test
    @DisplayName("US-5: Doctor can toggle unavailable days off")
    void testDoctorCanToggleUnavailableDate() {
        String targetDate = InMemoryHospitalDatabase.getRelativeDate(4);

        // Mark day off
        doctorService.setDateAvailability("doc_2", targetDate, false);
        Map<String, List<String>> schedule = doctorService.getSevenDayAvailableSlots("doc_2");
        assertThat(schedule.get(targetDate)).isEmpty();

        // Restore availability
        doctorService.setDateAvailability("doc_2", targetDate, true);
        Map<String, List<String>> updatedSchedule = doctorService.getSevenDayAvailableSlots("doc_2");
        assertThat(updatedSchedule.get(targetDate)).isNotEmpty();
    }
}
