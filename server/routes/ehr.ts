import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from './auth';
import { EHRRecord, Notification } from '../types';

export const ehrRouter = Router();

// GET all EHR records for a patient (chronological order)
// US-7 Item 2: "Given a patient has prior visit records, when a doctor opens their EHR, then all past diagnoses and treatments are listed in chronological order."
ehrRouter.get('/patients/:patientId/records', authenticate, (req: Request, res: Response) => {
  const { patientId } = req.params;
  const session = (req as any).session;
  const currentDoctorId = session.role === 'doctor' ? session.userId : null;

  // Authorization check: Patient can only view their own records
  if (session.role === 'patient' && session.userId !== patientId) {
    return res.status(403).json({ error: 'Access Denied: You can only view your own medical records.' });
  }

  // Get all records for this patient
  const patientRecords = db.ehrRecords.filter((r) => r.patientId === patientId);

  // US-7 Item 2: Chronological order (most recent first or earliest first, we provide descending by visitDate with exact timestamp)
  const sortedRecords = [...patientRecords].sort((a, b) => {
    return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
  });

  // Check privacy for doctor
  // If doctor is viewing, include metadata on whether record is private or accessible
  const recordsWithAccessMeta = sortedRecords.map((rec) => {
    const isRestrictedForThisDoctor =
      session.role === 'doctor' &&
      rec.privacyLevel === 'private' &&
      rec.attendingDoctorId !== currentDoctorId;

    if (isRestrictedForThisDoctor) {
      return {
        id: rec.id,
        patientId: rec.patientId,
        patientName: rec.patientName,
        attendingDoctorId: rec.attendingDoctorId,
        attendingDoctorName: rec.attendingDoctorName,
        department: rec.department,
        visitDate: rec.visitDate,
        privacyLevel: rec.privacyLevel,
        isAccessRestricted: true,
        summary: 'Confidential / Private Record - Restricted Access',
      };
    }

    return {
      ...rec,
      isAccessRestricted: false,
    };
  });

  const patient = db.findPatientById(patientId);

  return res.json({
    patient: patient
      ? {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          phone: patient.phone,
          email: patient.email,
        }
      : null,
    totalRecords: patientRecords.length,
    records: recordsWithAccessMeta,
  });
});

// GET specific EHR record by recordId
// US-3 Item 3: "Given a doctor is logged in, when they access another doctor's private patient records, then access is denied."
ehrRouter.get('/records/:recordId', authenticate, (req: Request, res: Response) => {
  const { recordId } = req.params;
  const session = (req as any).session;
  const user = (req as any).user;

  const record = db.ehrRecords.find((r) => r.id === recordId);
  if (!record) {
    return res.status(404).json({ error: 'EHR Record not found.' });
  }

  // 1. If Patient: must be the patient themselves
  if (session.role === 'patient') {
    if (record.patientId !== session.userId) {
      return res.status(403).json({
        error: 'Access Denied: You cannot view medical records belonging to other patients.',
        code: 'PATIENT_UNAUTHORIZED',
      });
    }
    return res.json({ record });
  }

  // 2. If Doctor: check US-3 Item 3 Access Control!
  if (session.role === 'doctor') {
    if (record.privacyLevel === 'private' && record.attendingDoctorId !== user.id) {
      return res.status(403).json({
        error: `Access Denied: This patient record is marked PRIVATE and is exclusively restricted to ${record.attendingDoctorName}. Access by other doctors is prohibited under hospital privacy compliance.`,
        code: 'PRIVATE_RECORD_ACCESS_DENIED',
        attendingDoctorName: record.attendingDoctorName,
        department: record.department,
        recordId: record.id,
      });
    }
  }

  return res.json({ record });
});

// ------------------- US-7 Item 1: ADD DIAGNOSIS NOTES -------------------
// "Given a doctor opens a patient's profile, when the consultation is complete, then the doctor can add diagnosis notes to the patient's medical history."
ehrRouter.post('/patients/:patientId/records', authenticate, requireRole(['doctor']), (req: Request, res: Response) => {
  const { patientId } = req.params;
  const doctor = (req as any).user;

  const patient = db.findPatientById(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const {
    diagnosis,
    symptoms,
    treatment,
    prescriptions,
    vitals,
    notes,
    privacyLevel,
    appointmentId,
  } = req.body;

  if (!diagnosis || !diagnosis.trim()) {
    return res.status(400).json({ error: 'Diagnosis notes are required.' });
  }

  const nowIso = new Date().toISOString();

  // US-7 Item 3: Change is timestamped and attributed to that doctor
  const newRecord: EHRRecord = {
    id: `ehr_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patientId: patient.id,
    patientName: patient.name,
    attendingDoctorId: doctor.id,
    attendingDoctorName: doctor.name,
    department: doctor.department,
    visitDate: nowIso,
    diagnosis: diagnosis.trim(),
    symptoms: symptoms?.trim() || '',
    treatment: treatment?.trim() || '',
    prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
    vitals: vitals || {
      bloodPressure: '120/80 mmHg',
      heartRate: '75 bpm',
      temperature: '98.6 °F',
      oxygenLevel: '99%',
      weight: '70 kg',
    },
    notes: notes?.trim() || '',
    privacyLevel: privacyLevel === 'private' ? 'private' : 'standard',
    createdAt: nowIso,
    updatedAt: nowIso,
    lastUpdatedByDoctorId: doctor.id,
    lastUpdatedByDoctorName: doctor.name,
  };

  db.ehrRecords.unshift(newRecord);

  // If associated appointment exists, mark as completed
  if (appointmentId) {
    const apt = db.appointments.find((a) => a.id === appointmentId);
    if (apt) {
      apt.status = 'Completed';
      apt.updatedAt = nowIso;
    }
  }

  // Send notification to patient
  const notif: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: patient.id,
    title: 'New Clinical Record Added',
    message: `${doctor.name} added diagnosis notes and treatment plan to your medical history.`,
    type: 'ehr_updated',
    read: false,
    createdAt: nowIso,
  };
  db.notifications.unshift(notif);

  return res.status(201).json({
    message: 'Medical consultation notes successfully added to patient EHR record!',
    record: newRecord,
  });
});

// ------------------- US-7 Item 3: UPDATE EHR RECORD -------------------
// "Given a doctor updates a patient's record, when the update is saved, then the change is timestamped and attributed to that doctor."
ehrRouter.put('/records/:recordId', authenticate, requireRole(['doctor']), (req: Request, res: Response) => {
  const { recordId } = req.params;
  const doctor = (req as any).user;

  const record = db.ehrRecords.find((r) => r.id === recordId);
  if (!record) {
    return res.status(404).json({ error: 'EHR Record not found.' });
  }

  // Check if private record of another doctor
  if (record.privacyLevel === 'private' && record.attendingDoctorId !== doctor.id) {
    return res.status(403).json({
      error: `Access Denied: You cannot update a private record authored by ${record.attendingDoctorName}.`,
      code: 'PRIVATE_RECORD_ACCESS_DENIED',
    });
  }

  const { diagnosis, symptoms, treatment, prescriptions, vitals, notes, privacyLevel } = req.body;

  if (diagnosis !== undefined) record.diagnosis = diagnosis;
  if (symptoms !== undefined) record.symptoms = symptoms;
  if (treatment !== undefined) record.treatment = treatment;
  if (prescriptions !== undefined && Array.isArray(prescriptions)) record.prescriptions = prescriptions;
  if (vitals !== undefined) record.vitals = { ...record.vitals, ...vitals };
  if (notes !== undefined) record.notes = notes;
  if (privacyLevel !== undefined) record.privacyLevel = privacyLevel;

  // US-7 Item 3: Timestamped and attributed to current doctor
  const nowIso = new Date().toISOString();
  record.updatedAt = nowIso;
  record.lastUpdatedByDoctorId = doctor.id;
  record.lastUpdatedByDoctorName = doctor.name;

  return res.json({
    message: `Record successfully updated. Timestamped at ${nowIso} and attributed to ${doctor.name}.`,
    record,
  });
});

// List all patients for doctor directory
ehrRouter.get('/patients-list', authenticate, requireRole(['doctor']), (_req: Request, res: Response) => {
  const patients = db.patients.map((p) => {
    const recordsCount = db.ehrRecords.filter((r) => r.patientId === p.id).length;
    const lastRecord = db.ehrRecords
      .filter((r) => r.patientId === p.id)
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0];

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      dob: p.dob,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      recordsCount,
      lastVisitDate: lastRecord ? lastRecord.visitDate : null,
      lastDiagnosis: lastRecord ? lastRecord.diagnosis : 'No recorded visits',
    };
  });

  return res.json({ patients });
});
