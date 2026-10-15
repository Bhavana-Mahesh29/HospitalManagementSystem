export type UserRole = 'patient' | 'doctor';

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  failedLoginAttempts: number;
  lockUntil?: string | null; // ISO string if locked
  createdAt: string;
}

export interface PatientUser extends BaseUser {
  role: 'patient';
  dob: string; // YYYY-MM-DD
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export interface DoctorUser extends BaseUser {
  role: 'doctor';
  department: string;
  qualification: string;
  room: string;
  avatarUrl: string;
  bio: string;
  experienceYears: number;
  consultationFee: number;
  unavailableDates: string[]; // YYYY-MM-DD
}

export type User = PatientUser | DoctorUser;

export interface Session {
  token: string;
  userId: string;
  role: UserRole;
  email: string;
  name: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 AM"
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  cancellationReason?: string;
  isLateCancellation?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface EHRRecord {
  id: string;
  patientId: string;
  patientName: string;
  attendingDoctorId: string;
  attendingDoctorName: string;
  department: string;
  visitDate: string; // ISO or YYYY-MM-DD
  diagnosis: string;
  symptoms: string;
  treatment: string;
  prescriptions: Prescription[];
  vitals: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    oxygenLevel: string;
    weight: string;
  };
  notes: string;
  privacyLevel: 'standard' | 'private'; // Private records can only be viewed by attending doctor
  createdAt: string;
  updatedAt: string;
  lastUpdatedByDoctorId: string;
  lastUpdatedByDoctorName: string;
}

export interface Notification {
  id: string;
  userId: string; // patientId
  title: string;
  message: string;
  type: 'appointment_confirmed' | 'appointment_cancelled' | 'appointment_rescheduled' | 'ehr_updated' | 'security_alert';
  read: boolean;
  createdAt: string;
}
