package com.carepulse.hospital.repository;

import com.carepulse.hospital.model.*;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Repository
public class InMemoryHospitalDatabase {

    public static final List<String> STANDARD_TIME_SLOTS = List.of(
            "09:00 AM", "09:45 AM", "10:30 AM", "11:15 AM",
            "02:00 PM", "02:45 PM", "03:30 PM", "04:15 PM"
    );

    public static final List<String> DEPARTMENTS = List.of(
            "Cardiology", "Neurology", "Pediatrics", "Orthopedics", "Dermatology", "General Medicine"
    );

    private final List<Doctor> doctors = new CopyOnWriteArrayList<>();
    private final List<Patient> patients = new CopyOnWriteArrayList<>();
    private final List<Appointment> appointments = new CopyOnWriteArrayList<>();
    private final List<EHRRecord> ehrRecords = new CopyOnWriteArrayList<>();
    private final List<Notification> notifications = new CopyOnWriteArrayList<>();
    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();

    public InMemoryHospitalDatabase() {
        seed();
    }

    public static String getRelativeDate(int offsetDays) {
        return LocalDate.now().plusDays(offsetDays).format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    public void seed() {
        doctors.clear();
        patients.clear();
        appointments.clear();
        ehrRecords.clear();
        notifications.clear();
        sessions.clear();

        // 1. Seed Doctors
        Doctor d1 = new Doctor(
                "doc_1", "Dr. Sarah Jenkins", "sarah.jenkins@hospital.org", "+1 (555) 234-5678", "Password123!",
                "Cardiology", "MD, FACC - Harvard Medical School", "Suite 402 - Heart Center",
                "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
                "Senior Interventional Cardiologist specializing in adult cardiac care and preventive cardiology.",
                14, 150.0
        );
        d1.addUnavailableDate(getRelativeDate(2)); // Day + 2 is unavailable

        Doctor d2 = new Doctor(
                "doc_2", "Dr. Marcus Chen", "marcus.chen@hospital.org", "+1 (555) 345-6789", "Password123!",
                "Neurology", "MD, PhD - Johns Hopkins University", "Suite 310 - Neuro Institute",
                "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
                "Board-certified Neurologist focusing on cognitive disorders and clinical neurophysiology.",
                11, 175.0
        );

        Doctor d3 = new Doctor(
                "doc_3", "Dr. Elena Rodriguez", "elena.rodriguez@hospital.org", "+1 (555) 456-7890", "Password123!",
                "Pediatrics", "MD, FAAP - Stanford University", "Suite 205 - Childrens Pavilion",
                "https://images.unsplash.com/photo-1594824813739-9d58be9f7e59?auto=format&fit=crop&q=80&w=300",
                "Compassionate Pediatrician dedicated to adolescent medicine and infant care.",
                9, 130.0
        );
        d3.addUnavailableDate(getRelativeDate(4));

        Doctor d4 = new Doctor(
                "doc_4", "Dr. James Wilson", "james.wilson@hospital.org", "+1 (555) 567-8901", "Password123!",
                "Orthopedics", "MD, FAAOS - Mayo Clinic", "Suite 512 - Bone & Joint Care",
                "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
                "Specialist in sports medicine, arthroscopy, and joint reconstruction.",
                16, 160.0
        );

        Doctor d5 = new Doctor(
                "doc_5", "Dr. Priya Patel", "priya.patel@hospital.org", "+1 (555) 678-9012", "Password123!",
                "Dermatology", "MD, FAAD - Columbia University", "Suite 104 - Skin & Laser Clinic",
                "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
                "Expert in clinical dermatology and autoimmune dermatoses.",
                8, 140.0
        );

        Doctor d6 = new Doctor(
                "doc_6", "Dr. Robert Vance", "robert.vance@hospital.org", "+1 (555) 789-0123", "Password123!",
                "General Medicine", "MD, FACP - UCSF School of Medicine", "Suite 101 - Primary Health",
                "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=300",
                "Primary care physician focusing on complex chronic illness management.",
                20, 120.0
        );

        doctors.addAll(List.of(d1, d2, d3, d4, d5, d6));

        // 2. Seed Patients
        Patient p1 = new Patient(
                "pat_1", "Johnathan Doe", "john@example.com", "+1 (555) 901-2345", "Password123!",
                "1988-06-14", "Male", "O+", "Jane Doe (+1 555-901-2346)"
        );
        Patient p2 = new Patient(
                "pat_2", "Emily Parker", "emily@example.com", "+1 (555) 812-3456", "Password123!",
                "1995-11-23", "Female", "A+", "David Parker (+1 555-812-3457)"
        );
        Patient p3 = new Patient(
                "pat_3", "Michael Brown", "michael@example.com", "+1 (555) 723-4567", "Password123!",
                "1976-04-09", "Male", "B-", "Sarah Brown (+1 555-723-4568)"
        );
        patients.addAll(List.of(p1, p2, p3));

        // 3. Seed Appointments
        Appointment apt1 = new Appointment(
                "apt_booked_slot", "pat_2", "Emily Parker", "emily@example.com", "+1 (555) 812-3456",
                "doc_1", "Dr. Sarah Jenkins", "Cardiology",
                getRelativeDate(1), "10:30 AM", "Annual cardiology screening."
        );
        appointments.add(apt1);

        Appointment apt2 = new Appointment(
                "apt_future_1", "pat_1", "Johnathan Doe", "john@example.com", "+1 (555) 901-2345",
                "doc_4", "Dr. James Wilson", "Orthopedics",
                getRelativeDate(3), "02:00 PM", "Knee soreness evaluation."
        );
        appointments.add(apt2);

        // 4. Seed EHR Records
        EHRRecord rec1 = new EHRRecord(
                "ehr_rec_1", "pat_1", "Johnathan Doe",
                "doc_6", "Dr. Robert Vance", "General Medicine",
                "Acute Viral Rhinitis & Pharyngitis",
                "Sore throat, mild dry cough, low-grade fever.",
                "Supportive hydration, rest, and antipyretics.",
                "standard"
        );
        rec1.setVitals(new Vitals("122/80 mmHg", "74 bpm", "99.4 °F", "98%", "76 kg"));
        rec1.getPrescriptions().add(new Prescription("Acetaminophen 500mg", "500mg", "Every 6h PRN", "5 days"));
        ehrRecords.add(rec1);

        // Private Record for Emily under Dr. Marcus Chen (for testing US-3 Item 3)
        EHRRecord recPrivate = new EHRRecord(
                "ehr_rec_private_emily", "pat_2", "Emily Parker",
                "doc_2", "Dr. Marcus Chen", "Neurology",
                "Complex Intractable Migraine with Visual Aura [Restricted File]",
                "Scintillating scotoma, photophobia, unilateral throbbing hemicrania.",
                "CGRP antagonist therapy and strict migraine tracking.",
                "private"
        );
        recPrivate.setVitals(new Vitals("116/74 mmHg", "68 bpm", "98.6 °F", "99%", "59 kg"));
        recPrivate.getPrescriptions().add(new Prescription("Ubrogepant 50mg", "50mg", "At migraine onset", "16 tabs"));
        ehrRecords.add(recPrivate);
    }

    // --- Accessors ---
    public List<Doctor> getDoctors() { return doctors; }
    public List<Patient> getPatients() { return patients; }
    public List<Appointment> getAppointments() { return appointments; }
    public List<EHRRecord> getEhrRecords() { return ehrRecords; }
    public List<Notification> getNotifications() { return notifications; }
    public Map<String, UserSession> getSessions() { return sessions; }

    public Optional<User> findUserByEmail(String email) {
        if (email == null) return Optional.empty();
        String clean = email.trim().toLowerCase();
        for (Patient p : patients) {
            if (p.getEmail().equalsIgnoreCase(clean)) return Optional.of(p);
        }
        for (Doctor d : doctors) {
            if (d.getEmail().equalsIgnoreCase(clean)) return Optional.of(d);
        }
        return Optional.empty();
    }

    public Optional<User> findUserById(String id) {
        if (id == null) return Optional.empty();
        for (Patient p : patients) {
            if (p.getId().equals(id)) return Optional.of(p);
        }
        for (Doctor d : doctors) {
            if (d.getId().equals(id)) return Optional.of(d);
        }
        return Optional.empty();
    }

    public Optional<Doctor> findDoctorById(String id) {
        return doctors.stream().filter(d -> d.getId().equals(id)).findFirst();
    }

    public Optional<Patient> findPatientById(String id) {
        return patients.stream().filter(p -> p.getId().equals(p.getId())).filter(p -> p.getId().equals(id)).findFirst();
    }

    public Optional<Appointment> findAppointmentById(String id) {
        return appointments.stream().filter(a -> a.getId().equals(id)).findFirst();
    }

    public Optional<EHRRecord> findEHRRecordById(String id) {
        return ehrRecords.stream().filter(r -> r.getId().equals(id)).findFirst();
    }
}
