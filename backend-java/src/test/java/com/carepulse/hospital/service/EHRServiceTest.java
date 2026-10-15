package com.carepulse.hospital.service;

import com.carepulse.hospital.exception.AccessDeniedException;
import com.carepulse.hospital.exception.ValidationException;
import com.carepulse.hospital.model.*;
import com.carepulse.hospital.repository.InMemoryHospitalDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JUnit 5: Electronic Health Records (EHR) & Privacy Access Control Tests")
public class EHRServiceTest {

    private InMemoryHospitalDatabase db;
    private EHRService ehrService;

    @BeforeEach
    void setUp() {
        db = new InMemoryHospitalDatabase();
        ehrService = new EHRService(db);
    }

    @Test
    @DisplayName("US-7 Item 2: Patient prior medical records are listed in chronological order")
    void testChronologicalPatientRecordHistory() {
        List<EHRRecord> records = ehrService.getPatientRecords("pat_1", "pat_1", UserRole.PATIENT);
        assertThat(records).isNotEmpty();

        // Check chronological ordering: element 0 should be newer or equal to element 1
        for (int i = 0; i < records.size() - 1; i++) {
            assertThat(records.get(i).getVisitDate())
                    .isAfterOrEqualTo(records.get(i + 1).getVisitDate());
        }
    }

    @Test
    @DisplayName("US-3 Item 3: Doctor accessing another doctor's private record is strictly DENIED")
    void testDoctorAccessToAnotherDoctorsPrivateRecordStrictlyDenied() {
        // Record 'ehr_rec_private_emily' is marked PRIVATE and authored by Dr. Marcus Chen (doc_2)
        EHRRecord privateRecord = db.findEHRRecordById("ehr_rec_private_emily").orElseThrow();
        assertThat(privateRecord.isPrivate()).isTrue();
        assertThat(privateRecord.getAttendingDoctorId()).isEqualTo("doc_2");

        // Dr. Sarah Jenkins (doc_1) attempts to access Dr. Marcus Chen's private record
        assertThatThrownBy(() ->
                ehrService.getRecordById("ehr_rec_private_emily", "doc_1", UserRole.DOCTOR)
        )
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("marked PRIVATE")
                .hasMessageContaining("restricted to Dr. Marcus Chen");
    }

    @Test
    @DisplayName("US-3 Item 3: Authoring doctor CAN access their own private record")
    void testAttendingDoctorCanAccessOwnPrivateRecord() {
        // Dr. Marcus Chen (doc_2) accessing his own private record
        EHRRecord record = ehrService.getRecordById("ehr_rec_private_emily", "doc_2", UserRole.DOCTOR);
        assertThat(record).isNotNull();
        assertThat(record.getDiagnosis()).contains("Complex Intractable Migraine");
    }

    @Test
    @DisplayName("US-7 Item 1 & 3: Adding clinical notes is timestamped and attributed to attending doctor")
    void testAddClinicalRecordTimestampsAndAttributesDoctor() {
        Doctor doctor = db.findDoctorById("doc_1").orElseThrow();

        EHRRecord record = ehrService.addClinicalRecord(
                "pat_1", doctor,
                "Cardiac Arrhythmia Evaluation",
                "Palpitations, mild exertional dyspnea",
                "24-hour Holter monitoring prescribed",
                List.of(new Prescription("Metoprolol Succinate 25mg", "25mg", "Once daily", "30 days")),
                new Vitals("130/85 mmHg", "88 bpm", "98.7 °F", "99%", "75 kg"),
                "Patient instructed to maintain sodium restriction.",
                "standard",
                null
        );

        assertThat(record).isNotNull();
        assertThat(record.getAttendingDoctorId()).isEqualTo("doc_1");
        assertThat(record.getAttendingDoctorName()).isEqualTo("Dr. Sarah Jenkins");
        assertThat(record.getLastUpdatedByDoctorId()).isEqualTo("doc_1");
        assertThat(record.getLastUpdatedByDoctorName()).isEqualTo("Dr. Sarah Jenkins");
        assertThat(record.getCreatedAt()).isNotNull();
        assertThat(record.getUpdatedAt()).isNotNull();
        assertThat(record.getPrescriptions()).hasSize(1);
    }

    @Test
    @DisplayName("Validation: Adding EHR record with blank diagnosis throws ValidationException")
    void testBlankDiagnosisValidation() {
        Doctor doctor = db.findDoctorById("doc_1").orElseThrow();

        assertThatThrownBy(() ->
                ehrService.addClinicalRecord(
                        "pat_1", doctor, "", "Symptoms", "Treatment",
                        null, null, "", "standard", null
                )
        )
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Diagnosis notes are required");
    }

    @Test
    @DisplayName("Security: Patient cannot view medical records belonging to other patients")
    void testPatientCannotViewOtherPatientsRecords() {
        // Patient 1 (pat_1) attempts to view Patient 2's (pat_2) records
        assertThatThrownBy(() ->
                ehrService.getPatientRecords("pat_2", "pat_1", UserRole.PATIENT)
        )
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only view your own medical records");
    }
}
