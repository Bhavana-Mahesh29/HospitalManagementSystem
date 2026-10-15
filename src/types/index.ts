export type UserRole = 'patient' | 'doctor';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  department?: string;
  qualification?: string;
  room?: string;
  avatarUrl?: string;
  unavailableDates?: string[];
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  qualification: string;
  room: string;
  avatarUrl: string;
  bio: string;
  experienceYears: number;
  consultationFee: number;
  unavailableDates: string[];
}

export interface TimeSlotInfo {
  timeSlot: string;
  available: boolean;
  status: 'Available' | 'Booked';
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  dayName: string;
  formattedDate: string;
  isUnavailable: boolean;
  reason?: string;
  slots: TimeSlotInfo[];
  openSlotCount: number;
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
  date: string;
  timeSlot: string;
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

export interface Vitals {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  oxygenLevel: string;
  weight: string;
}

export interface EHRRecord {
  id: string;
  patientId: string;
  patientName: string;
  attendingDoctorId: string;
  attendingDoctorName: string;
  department: string;
  visitDate: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  prescriptions: Prescription[];
  vitals: Vitals;
  notes: string;
  privacyLevel: 'standard' | 'private';
  isAccessRestricted?: boolean;
  createdAt: string;
  updatedAt: string;
  lastUpdatedByDoctorId: string;
  lastUpdatedByDoctorName: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment_confirmed' | 'appointment_cancelled' | 'appointment_rescheduled' | 'ehr_updated' | 'security_alert';
  read: boolean;
  createdAt: string;
}
