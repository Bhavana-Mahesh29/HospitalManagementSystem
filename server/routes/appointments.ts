import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticate } from './auth';
import { Appointment, Notification } from '../types';

export const appointmentsRouter = Router();

// Helper to check if an appointment is within 2 hours of current time
export function checkLateCancellation(dateStr: string, timeSlotStr: string): { isLate: boolean; hoursRemaining: number } {
  // Parse timeSlotStr e.g. "09:45 AM" or "02:00 PM"
  const [timePart, modifier] = timeSlotStr.split(' ');
  const [hoursStr, minsStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minsStr, 10);

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  // Appointment datetime
  const [year, month, day] = dateStr.split('-').map(Number);
  const appointmentTime = new Date(year, month - 1, day, hours, minutes).getTime();
  const now = Date.now();

  const diffMs = appointmentTime - now;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  // If appointment is within 2 hours (or in the past today)
  return {
    isLate: hoursRemaining <= 2.0,
    hoursRemaining: Math.max(0, parseFloat(hoursRemaining.toFixed(1))),
  };
}

// GET all appointments for current logged in user (patient or doctor)
appointmentsRouter.get('/', authenticate, (req: Request, res: Response) => {
  const session = (req as any).session;

  let list: Appointment[] = [];
  if (session.role === 'patient') {
    list = db.appointments.filter((a) => a.patientId === session.userId);
  } else if (session.role === 'doctor') {
    list = db.appointments.filter((a) => a.doctorId === session.userId);
  }

  // Sort: upcoming first, then by date/time
  list.sort((a, b) => {
    const da = new Date(`${a.date} ${a.timeSlot}`).getTime() || 0;
    const dbTime = new Date(`${b.date} ${b.timeSlot}`).getTime() || 0;
    return dbTime - da;
  });

  return res.json({ appointments: list });
});

// GET specific appointment by ID
appointmentsRouter.get('/:id', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const session = (req as any).session;
  const apt = db.appointments.find((a) => a.id === id);

  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Authorize: only patient or doctor involved
  if (session.role === 'patient' && apt.patientId !== session.userId) {
    return res.status(403).json({ error: 'Forbidden: You can only view your own appointments' });
  }
  if (session.role === 'doctor' && apt.doctorId !== session.userId) {
    return res.status(403).json({ error: 'Forbidden: You can only view appointments assigned to you' });
  }

  return res.json({ appointment: apt });
});

// ------------------- US-4: BOOK APPOINTMENT -------------------
appointmentsRouter.post('/', authenticate, (req: Request, res: Response) => {
  const session = (req as any).session;
  const patient = (req as any).user;

  if (session.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can book appointments.' });
  }

  const { doctorId, date, timeSlot, notes } = req.body;

  if (!doctorId || !date || !timeSlot) {
    return res.status(400).json({ error: 'Doctor ID, appointment date, and time slot are required.' });
  }

  const doctor = db.findDoctorById(doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // Check if doctor marked this day as unavailable (US-5 #2)
  if (doctor.unavailableDates.includes(date)) {
    return res.status(400).json({
      error: `Doctor ${doctor.name} is unavailable on ${date}. Please select another date.`,
    });
  }

  // US-4 Item 2: Check if slot is already booked by another patient
  const conflict = db.appointments.find(
    (a) => a.doctorId === doctorId && a.date === date && a.timeSlot === timeSlot && a.status === 'Scheduled'
  );

  if (conflict) {
    return res.status(409).json({
      error: 'This time slot is already booked by another patient. Please select an available slot.',
      code: 'SLOT_UNAVAILABLE',
    });
  }

  // Create new appointment (US-4 Item 1)
  const newAppointment: Appointment = {
    id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    patientId: patient.id,
    patientName: patient.name,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    doctorId: doctor.id,
    doctorName: doctor.name,
    department: doctor.department,
    date,
    timeSlot,
    status: 'Scheduled',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.appointments.unshift(newAppointment);

  // US-4 Item 3: Given a booking is successful, send confirmation notification to the patient
  const notif: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: patient.id,
    title: 'Appointment Booking Confirmed',
    message: `Your appointment with ${doctor.name} (${doctor.department}) on ${date} at ${timeSlot} has been successfully scheduled.`,
    type: 'appointment_confirmed',
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  return res.status(201).json({
    message: 'Appointment successfully booked!',
    appointment: newAppointment,
    notification: notif,
  });
});

// ------------------- US-6: CANCEL & RESCHEDULE -------------------

// Check late cancellation preview
// US-6 Item 3: "Given an appointment is less than 2 hours away, when a patient tries to cancel it, then a warning about late cancellation is shown."
appointmentsRouter.get('/:id/cancel-preview', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const apt = db.appointments.find((a) => a.id === id);

  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const { isLate, hoursRemaining } = checkLateCancellation(apt.date, apt.timeSlot);

  return res.json({
    appointmentId: apt.id,
    date: apt.date,
    timeSlot: apt.timeSlot,
    isLateCancellation: isLate,
    hoursRemaining,
    warning: isLate
      ? `Warning: This appointment is scheduled in ${hoursRemaining <= 0 ? 'less than an hour' : `${hoursRemaining} hours`} (less than the 2-hour policy window). Late cancellation may incur administrative clinical review.`
      : null,
  });
});

// Cancel appointment (US-6 Item 1 & 3)
appointmentsRouter.patch('/:id/cancel', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const session = (req as any).session;
  const user = (req as any).user;

  const apt = db.appointments.find((a) => a.id === id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Authorization check
  if (session.role === 'patient' && apt.patientId !== session.userId) {
    return res.status(403).json({ error: 'Forbidden: You can only cancel your own appointments.' });
  }

  if (apt.status === 'Cancelled') {
    return res.status(400).json({ error: 'Appointment is already cancelled.' });
  }

  const { isLate } = checkLateCancellation(apt.date, apt.timeSlot);

  // Update appointment: slot is released immediately because status becomes 'Cancelled'
  apt.status = 'Cancelled';
  apt.cancellationReason = reason || 'Cancelled by patient';
  apt.isLateCancellation = isLate;
  apt.updatedAt = new Date().toISOString();

  // Send notification to patient
  const notif: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: apt.patientId,
    title: isLate ? 'Appointment Cancelled (Late Cancellation Notice)' : 'Appointment Cancelled',
    message: isLate
      ? `Your appointment with ${apt.doctorName} on ${apt.date} at ${apt.timeSlot} was cancelled with less than 2 hours notice.`
      : `Your appointment with ${apt.doctorName} on ${apt.date} at ${apt.timeSlot} was successfully cancelled and the slot has been released.`,
    type: 'appointment_cancelled',
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  return res.json({
    message: 'Appointment cancelled successfully and time slot released.',
    appointment: apt,
    isLateCancellation: isLate,
  });
});

// Reschedule appointment (US-6 Item 2)
// "Given a patient chooses 'Reschedule', when they pick a new available slot, then the old slot is released and the appointment is updated to the new time."
appointmentsRouter.patch('/:id/reschedule', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newDate, newTimeSlot } = req.body;
  const session = (req as any).session;

  if (!newDate || !newTimeSlot) {
    return res.status(400).json({ error: 'New date and new time slot are required.' });
  }

  const apt = db.appointments.find((a) => a.id === id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  if (session.role === 'patient' && apt.patientId !== session.userId) {
    return res.status(403).json({ error: 'Forbidden: You can only reschedule your own appointments.' });
  }

  const doctor = db.findDoctorById(apt.doctorId);
  if (doctor && doctor.unavailableDates.includes(newDate)) {
    return res.status(400).json({ error: `Doctor is unavailable on ${newDate}. Please pick another date.` });
  }

  // Check if target slot is already booked by another active appointment
  const conflict = db.appointments.find(
    (a) =>
      a.id !== apt.id &&
      a.doctorId === apt.doctorId &&
      a.date === newDate &&
      a.timeSlot === newTimeSlot &&
      a.status === 'Scheduled'
  );

  if (conflict) {
    return res.status(409).json({
      error: 'The requested new slot is already booked. Please choose an open slot.',
      code: 'SLOT_UNAVAILABLE',
    });
  }

  const previousDate = apt.date;
  const previousSlot = apt.timeSlot;

  // Update appointment - old slot is released because date/timeSlot are updated
  apt.date = newDate;
  apt.timeSlot = newTimeSlot;
  apt.status = 'Scheduled';
  apt.updatedAt = new Date().toISOString();

  // Send notification to patient
  const notif: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: apt.patientId,
    title: 'Appointment Rescheduled',
    message: `Your appointment with ${apt.doctorName} was rescheduled from ${previousDate} ${previousSlot} to ${newDate} at ${newTimeSlot}.`,
    type: 'appointment_rescheduled',
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  return res.json({
    message: 'Appointment successfully rescheduled! Previous slot has been released.',
    appointment: apt,
  });
});
