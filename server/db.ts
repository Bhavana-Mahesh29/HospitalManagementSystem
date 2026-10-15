import {
  User,
  PatientUser,
  DoctorUser,
  Session,
  Appointment,
  EHRRecord,
  Notification,
} from './types';

// Helper to format date YYYY-MM-DD relative to today
export function getRelativeDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const STANDARD_TIME_SLOTS = [
  '09:00 AM',
  '09:45 AM',
  '10:30 AM',
  '11:15 AM',
  '02:00 PM',
  '02:45 PM',
  '03:30 PM',
  '04:15 PM',
];

export const DEPARTMENTS = [
  'All Departments',
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'General Medicine',
];

class Database {
  patients: PatientUser[] = [];
  doctors: DoctorUser[] = [];
  sessions: Map<string, Session> = new Map();
  appointments: Appointment[] = [];
  ehrRecords: EHRRecord[] = [];
  notifications: Notification[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    // 1. Doctors
    this.doctors = [
      {
        id: 'doc_1',
        role: 'doctor',
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@hospital.org',
        phone: '+1 (555) 234-5678',
        password: 'Password123!',
        department: 'Cardiology',
        qualification: 'MD, FACC - Harvard Medical School',
        room: 'Suite 402 - Heart Center',
        avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
        bio: 'Senior Interventional Cardiologist specializing in adult cardiac care, hypertension, and preventive cardiovascular health with over 14 years of clinical practice.',
        experienceYears: 14,
        consultationFee: 150,
        unavailableDates: [getRelativeDate(2)], // Day + 2 is unavailable for Dr. Jenkins (tests US-5 #2)
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-01-10').toISOString(),
      },
      {
        id: 'doc_2',
        role: 'doctor',
        name: 'Dr. Marcus Chen',
        email: 'marcus.chen@hospital.org',
        phone: '+1 (555) 345-6789',
        password: 'Password123!',
        department: 'Neurology',
        qualification: 'MD, PhD - Johns Hopkins University',
        room: 'Suite 310 - Neuro Institute',
        avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
        bio: 'Board-certified Neurologist focusing on cognitive disorders, migraine syndromes, and clinical neurophysiology.',
        experienceYears: 11,
        consultationFee: 175,
        unavailableDates: [],
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-02-15').toISOString(),
      },
      {
        id: 'doc_3',
        role: 'doctor',
        name: 'Dr. Elena Rodriguez',
        email: 'elena.rodriguez@hospital.org',
        phone: '+1 (555) 456-7890',
        password: 'Password123!',
        department: 'Pediatrics',
        qualification: 'MD, FAAP - Stanford University School of Medicine',
        room: 'Suite 205 - Childrens Pavilion',
        avatarUrl: 'https://images.unsplash.com/photo-1594824813739-9d58be9f7e59?auto=format&fit=crop&q=80&w=300',
        bio: 'Compassionate Pediatrician dedicated to adolescent medicine, infant developmental milestones, and pediatric immunology.',
        experienceYears: 9,
        consultationFee: 130,
        unavailableDates: [getRelativeDate(4)],
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-03-01').toISOString(),
      },
      {
        id: 'doc_4',
        role: 'doctor',
        name: 'Dr. James Wilson',
        email: 'james.wilson@hospital.org',
        phone: '+1 (555) 567-8901',
        password: 'Password123!',
        department: 'Orthopedics',
        qualification: 'MD, FAAOS - Mayo Clinic College of Medicine',
        room: 'Suite 512 - Bone & Joint Care',
        avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
        bio: 'Specialist in sports medicine, arthroscopy, joint reconstruction, and spinal biomechanics.',
        experienceYears: 16,
        consultationFee: 160,
        unavailableDates: [],
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-01-20').toISOString(),
      },
      {
        id: 'doc_5',
        role: 'doctor',
        name: 'Dr. Priya Patel',
        email: 'priya.patel@hospital.org',
        phone: '+1 (555) 678-9012',
        password: 'Password123!',
        department: 'Dermatology',
        qualification: 'MD, FAAD - Columbia University College of Physicians',
        room: 'Suite 104 - Skin & Laser Clinic',
        avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
        bio: 'Expert in clinical dermatology, autoimmune dermatoses, skin oncology screening, and therapeutic treatments.',
        experienceYears: 8,
        consultationFee: 140,
        unavailableDates: [],
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-04-12').toISOString(),
      },
      {
        id: 'doc_6',
        role: 'doctor',
        name: 'Dr. Robert Vance',
        email: 'robert.vance@hospital.org',
        phone: '+1 (555) 789-0123',
        password: 'Password123!',
        department: 'General Medicine',
        qualification: 'MD, FACP - UCSF School of Medicine',
        room: 'Suite 101 - Primary Health',
        avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=300',
        bio: 'Primary care physician focusing on complex chronic illness management, preventive wellness checks, and geriatric health.',
        experienceYears: 20,
        consultationFee: 120,
        unavailableDates: [],
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2023-11-05').toISOString(),
      },
    ];

    // 2. Pre-seeded Patients
    this.patients = [
      {
        id: 'pat_1',
        role: 'patient',
        name: 'Johnathan Doe',
        email: 'john@example.com',
        phone: '+1 (555) 901-2345',
        dob: '1988-06-14',
        password: 'Password123!',
        gender: 'Male',
        bloodGroup: 'O+',
        emergencyContact: 'Jane Doe (+1 555-901-2346)',
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-02-01').toISOString(),
      },
      {
        id: 'pat_2',
        role: 'patient',
        name: 'Emily Parker',
        email: 'emily@example.com',
        phone: '+1 (555) 812-3456',
        dob: '1995-11-23',
        password: 'Password123!',
        gender: 'Female',
        bloodGroup: 'A+',
        emergencyContact: 'David Parker (+1 555-812-3457)',
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-03-10').toISOString(),
      },
      {
        id: 'pat_3',
        role: 'patient',
        name: 'Michael Brown',
        email: 'michael@example.com',
        phone: '+1 (555) 723-4567',
        dob: '1976-04-09',
        password: 'Password123!',
        gender: 'Male',
        bloodGroup: 'B-',
        emergencyContact: 'Sarah Brown (+1 555-723-4568)',
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date('2024-04-01').toISOString(),
      },
    ];

    // 3. Pre-seeded Appointments
    // Compute a time slot for today within 1 hour so US-6 #3 (late cancellation warning < 2 hours) is readily testable!
    const now = new Date();
    const imminentTime = new Date(now.getTime() + 50 * 60 * 1000); // 50 mins from now
    const imminentHour = imminentTime.getHours();
    const imminentPeriod = imminentHour >= 12 ? 'PM' : 'AM';
    const formattedHour = ((imminentHour + 11) % 12 + 1).toString().padStart(2, '0');
    const imminentSlotStr = `${formattedHour}:00 ${imminentPeriod}`;

    this.appointments = [
      // Imminent appointment today for Johnathan Doe with Dr. Robert Vance (< 2 hours away)
      {
        id: 'apt_imminent',
        patientId: 'pat_1',
        patientName: 'Johnathan Doe',
        patientEmail: 'john@example.com',
        patientPhone: '+1 (555) 901-2345',
        doctorId: 'doc_6',
        doctorName: 'Dr. Robert Vance',
        department: 'General Medicine',
        date: getRelativeDate(0), // Today!
        timeSlot: imminentSlotStr,
        status: 'Scheduled',
        notes: 'Follow-up for recent blood pressure monitoring and medication check.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      // Appointment tomorrow for Emily Parker with Dr. Sarah Jenkins (10:30 AM slot is booked -> tests US-4 #2)
      {
        id: 'apt_booked_slot',
        patientId: 'pat_2',
        patientName: 'Emily Parker',
        patientEmail: 'emily@example.com',
        patientPhone: '+1 (555) 812-3456',
        doctorId: 'doc_1',
        doctorName: 'Dr. Sarah Jenkins',
        department: 'Cardiology',
        date: getRelativeDate(1), // Tomorrow
        timeSlot: '10:30 AM',
        status: 'Scheduled',
        notes: 'Annual cardiology screening and stress assessment.',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
      },
      // Upcoming appointment 3 days from now for Johnathan Doe with Dr. James Wilson (can reschedule or cancel freely)
      {
        id: 'apt_future_1',
        patientId: 'pat_1',
        patientName: 'Johnathan Doe',
        patientEmail: 'john@example.com',
        patientPhone: '+1 (555) 901-2345',
        doctorId: 'doc_4',
        doctorName: 'Dr. James Wilson',
        department: 'Orthopedics',
        date: getRelativeDate(3),
        timeSlot: '02:00 PM',
        status: 'Scheduled',
        notes: 'Knee soreness evaluation following running routine.',
        createdAt: new Date(Date.now() - 25000000).toISOString(),
        updatedAt: new Date(Date.now() - 25000000).toISOString(),
      },
      // Completed appointment in the past for Johnathan Doe with Dr. Sarah Jenkins
      {
        id: 'apt_past_1',
        patientId: 'pat_1',
        patientName: 'Johnathan Doe',
        patientEmail: 'john@example.com',
        patientPhone: '+1 (555) 901-2345',
        doctorId: 'doc_1',
        doctorName: 'Dr. Sarah Jenkins',
        department: 'Cardiology',
        date: getRelativeDate(-14),
        timeSlot: '09:45 AM',
        status: 'Completed',
        notes: 'Routine hypertension consultation and baseline ECG.',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
    ];

    // 4. Pre-seeded Electronic Health Records (EHR)
    this.ehrRecords = [
      // Record 1: Johnathan Doe - 6 months ago (General Medicine)
      {
        id: 'ehr_rec_1',
        patientId: 'pat_1',
        patientName: 'Johnathan Doe',
        attendingDoctorId: 'doc_6',
        attendingDoctorName: 'Dr. Robert Vance',
        department: 'General Medicine',
        visitDate: '2026-04-12T10:30:00.000Z',
        diagnosis: 'Acute Viral Rhinitis & Pharyngitis',
        symptoms: 'Sore throat, mild dry cough, low-grade fever for 3 days, nasal congestion.',
        treatment: 'Supportive hydration, saline nasal irrigation, rest, and antipyretics as needed.',
        prescriptions: [
          { medication: 'Acetaminophen 500mg', dosage: '500mg', frequency: 'Every 6 hours PRN', duration: '5 days' },
          { medication: 'Cetirizine 10mg', dosage: '10mg', frequency: 'Once daily at bedtime', duration: '7 days' },
        ],
        vitals: {
          bloodPressure: '122/80 mmHg',
          heartRate: '74 bpm',
          temperature: '99.4 °F',
          oxygenLevel: '98%',
          weight: '76 kg',
        },
        notes: 'Lungs clear bilaterally on auscultation. Erythematous posterior pharynx without exudate. Advised patient to monitor temp.',
        privacyLevel: 'standard',
        createdAt: '2026-04-12T11:15:00.000Z',
        updatedAt: '2026-04-12T11:15:00.000Z',
        lastUpdatedByDoctorId: 'doc_6',
        lastUpdatedByDoctorName: 'Dr. Robert Vance',
      },
      // Record 2: Johnathan Doe - 2 months ago (Cardiology)
      {
        id: 'ehr_rec_2',
        patientId: 'pat_1',
        patientName: 'Johnathan Doe',
        attendingDoctorId: 'doc_1',
        attendingDoctorName: 'Dr. Sarah Jenkins',
        department: 'Cardiology',
        visitDate: '2026-08-19T09:45:00.000Z',
        diagnosis: 'Stage 1 Essential Hypertension',
        symptoms: 'Mild occipital morning headaches, occasional episodic lightheadedness on standing.',
        treatment: 'Initiation of low-dose ACE inhibitor, dietary sodium restriction (<2000mg/day), moderate cardiovascular exercise.',
        prescriptions: [
          { medication: 'Lisinopril 10mg', dosage: '10mg', frequency: 'Once daily in morning', duration: '90 days' },
          { medication: 'Omega-3 Fish Oil', dosage: '1000mg', frequency: 'Twice daily with meals', duration: 'Ongoing' },
        ],
        vitals: {
          bloodPressure: '142/92 mmHg',
          heartRate: '82 bpm',
          temperature: '98.6 °F',
          oxygenLevel: '99%',
          weight: '78 kg',
        },
        notes: '12-lead ECG normal sinus rhythm with no ST-T abnormalities. Blood work ordered for comprehensive metabolic panel and lipid profile.',
        privacyLevel: 'standard',
        createdAt: '2026-08-19T10:40:00.000Z',
        updatedAt: '2026-08-19T10:40:00.000Z',
        lastUpdatedByDoctorId: 'doc_1',
        lastUpdatedByDoctorName: 'Dr. Sarah Jenkins',
      },
      // Record 3: Johnathan Doe - 2 weeks ago (Cardiology Follow-up)
      {
        id: 'ehr_rec_3',
        patientId: 'pat_1',
        patientName: 'Johnathan Doe',
        attendingDoctorId: 'doc_1',
        attendingDoctorName: 'Dr. Sarah Jenkins',
        department: 'Cardiology',
        visitDate: '2026-09-20T09:45:00.000Z',
        diagnosis: 'Well-Controlled Hypertension under Pharmacotherapy',
        symptoms: 'Headaches resolved; patient adhering diligently to lisinopril and exercise protocol.',
        treatment: 'Maintain current Lisinopril dosage. Continue home blood pressure log twice weekly.',
        prescriptions: [
          { medication: 'Lisinopril 10mg', dosage: '10mg', frequency: 'Once daily in morning', duration: '90 days refill' },
        ],
        vitals: {
          bloodPressure: '124/82 mmHg',
          heartRate: '72 bpm',
          temperature: '98.4 °F',
          oxygenLevel: '99%',
          weight: '76.8 kg',
        },
        notes: 'Excellent therapeutic response. Potassium and creatinine levels within normal physiological reference range. Next follow-up in 3 months.',
        privacyLevel: 'standard',
        createdAt: '2026-09-20T10:30:00.000Z',
        updatedAt: '2026-09-20T10:30:00.000Z',
        lastUpdatedByDoctorId: 'doc_1',
        lastUpdatedByDoctorName: 'Dr. Sarah Jenkins',
      },
      // Record 4: Emily Parker - Private record under Dr. Marcus Chen (Neurology)
      // TEST CASE FOR US-3 #3: "Given a doctor is logged in, when they access another doctor's private patient records, then access is denied."
      {
        id: 'ehr_rec_private_emily',
        patientId: 'pat_2',
        patientName: 'Emily Parker',
        attendingDoctorId: 'doc_2',
        attendingDoctorName: 'Dr. Marcus Chen',
        department: 'Neurology',
        visitDate: '2026-09-15T14:00:00.000Z',
        diagnosis: 'Complex Intractable Migraine with Visual Aura [Restricted File]',
        symptoms: 'Scintillating scotoma, photophobia, unilateral throbbing hemicrania with nausea.',
        treatment: 'CGRP antagonist therapy, strict migraine diary tracking, trigger avoidance.',
        prescriptions: [
          { medication: 'Ubrogepant 50mg', dosage: '50mg', frequency: 'At migraine onset PRN', duration: '16 tablets' },
          { medication: 'Propranolol ER 60mg', dosage: '60mg', frequency: 'Once daily in evening', duration: '60 days' },
        ],
        vitals: {
          bloodPressure: '116/74 mmHg',
          heartRate: '68 bpm',
          temperature: '98.6 °F',
          oxygenLevel: '99%',
          weight: '59 kg',
        },
        notes: 'Confidential neurological evaluation. Brain MRI unremarkable for acute intracranial pathology. Record designated Private per patient request and departmental protocol.',
        privacyLevel: 'private', // ONLY Dr. Marcus Chen (doc_2) can access!
        createdAt: '2026-09-15T15:00:00.000Z',
        updatedAt: '2026-09-15T15:00:00.000Z',
        lastUpdatedByDoctorId: 'doc_2',
        lastUpdatedByDoctorName: 'Dr. Marcus Chen',
      },
    ];

    // 5. Pre-seeded Notifications for Johnathan Doe
    this.notifications = [
      {
        id: 'notif_1',
        userId: 'pat_1',
        title: 'Appointment Confirmed',
        message: 'Your consultation with Dr. Robert Vance has been scheduled for today.',
        type: 'appointment_confirmed',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif_2',
        userId: 'pat_1',
        title: 'Medical Record Updated',
        message: 'Dr. Sarah Jenkins updated your EHR notes and prescription refills.',
        type: 'ehr_updated',
        read: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];
  }

  // --- Helper Methods ---

  findUserByEmail(email: string): User | undefined {
    const cleanEmail = email.trim().toLowerCase();
    const p = this.patients.find((u) => u.email.toLowerCase() === cleanEmail);
    if (p) return p;
    return this.doctors.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  findUserById(id: string): User | undefined {
    const p = this.patients.find((u) => u.id === id);
    if (p) return p;
    return this.doctors.find((u) => u.id === id);
  }

  findPatientById(id: string): PatientUser | undefined {
    return this.patients.find((u) => u.id === id);
  }

  findDoctorById(id: string): DoctorUser | undefined {
    return this.doctors.find((u) => u.id === id);
  }

  createPatient(data: Omit<PatientUser, 'id' | 'role' | 'failedLoginAttempts' | 'lockUntil' | 'createdAt'>): PatientUser {
    const newPatient: PatientUser = {
      ...data,
      id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: 'patient',
      failedLoginAttempts: 0,
      lockUntil: null,
      createdAt: new Date().toISOString(),
    };
    this.patients.push(newPatient);
    return newPatient;
  }

  // Session management
  createSession(user: User): Session {
    const token = `sess_${user.role}_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    // 15-minute idle limit (for doctor sessions and safety, 900,000 ms)
    const expires = new Date(now.getTime() + 15 * 60 * 1000);
    const session: Session = {
      token,
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    this.sessions.set(token, session);
    return session;
  }

  getSession(token: string): Session | undefined {
    const session = this.sessions.get(token);
    if (!session) return undefined;

    // Check if session has expired (idle for > 15 minutes)
    const now = Date.now();
    const lastActive = new Date(session.lastActiveAt).getTime();
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    if (now - lastActive > IDLE_TIMEOUT_MS) {
      // Session has expired due to 15-minute inactivity!
      this.sessions.delete(token);
      return undefined;
    }

    // Touch lastActiveAt
    session.lastActiveAt = new Date().toISOString();
    session.expiresAt = new Date(Date.now() + IDLE_TIMEOUT_MS).toISOString();
    return session;
  }

  deleteSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  // Invalidate session explicitly for idle simulation
  expireSession(token: string): void {
    this.sessions.delete(token);
  }
}

export const db = new Database();
