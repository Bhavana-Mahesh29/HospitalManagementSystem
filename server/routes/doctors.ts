import { Router, Request, Response } from 'express';
import { db, STANDARD_TIME_SLOTS, DEPARTMENTS, getRelativeDate } from '../db';
import { authenticate, requireRole } from './auth';

export const doctorsRouter = Router();

// GET all departments
doctorsRouter.get('/departments', (_req: Request, res: Response) => {
  return res.json({ departments: DEPARTMENTS });
});

// GET doctors list, optionally filtered by department
doctorsRouter.get('/', (req: Request, res: Response) => {
  const department = req.query.department as string;

  let docs = db.doctors.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    department: d.department,
    qualification: d.qualification,
    room: d.room,
    avatarUrl: d.avatarUrl,
    bio: d.bio,
    experienceYears: d.experienceYears,
    consultationFee: d.consultationFee,
    unavailableDates: d.unavailableDates,
  }));

  if (department && department !== 'All Departments') {
    docs = docs.filter((d) => d.department.toLowerCase() === department.toLowerCase());
  }

  return res.json({ doctors: docs });
});

// GET specific doctor profile and schedule availability for next 7 days
// US-5 Item 1: "Given a patient selects a department, when they view a doctor's profile, then only open time slots for the next 7 days are shown."
// US-5 Item 2: "Given a doctor has marked a day as unavailable, when a patient views that date, then no slots are shown for that day."
doctorsRouter.get('/:id/availability', (req: Request, res: Response) => {
  const doctorId = req.params.id;
  const doctor = db.findDoctorById(doctorId);

  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  // Generate next 7 days starting from today (day 0 to day 6)
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = getRelativeDate(i);
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + i);

    const isMarkedUnavailable = doctor.unavailableDates.includes(dateStr);

    // If doctor marked the day as unavailable, 0 slots are shown! (US-5 Item 2)
    if (isMarkedUnavailable) {
      days.push({
        date: dateStr,
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isUnavailable: true,
        reason: 'Doctor is unavailable on this date (Day Off / Leave).',
        slots: [],
        openSlotCount: 0,
      });
      continue;
    }

    // Find all active scheduled appointments for this doctor on this date
    const bookedAppointments = db.appointments.filter(
      (a) => a.doctorId === doctorId && a.date === dateStr && a.status === 'Scheduled'
    );
    const bookedSlotsSet = new Set(bookedAppointments.map((a) => a.timeSlot));

    // Slots status
    const slots = STANDARD_TIME_SLOTS.map((timeSlot) => {
      const isBooked = bookedSlotsSet.has(timeSlot);
      return {
        timeSlot,
        available: !isBooked,
        status: isBooked ? 'Booked' : 'Available',
      };
    });

    const openSlots = slots.filter((s) => s.available);

    days.push({
      date: dateStr,
      dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isUnavailable: false,
      slots,
      openSlotCount: openSlots.length,
    });
  }

  return res.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      department: doctor.department,
      qualification: doctor.qualification,
      room: doctor.room,
      avatarUrl: doctor.avatarUrl,
      consultationFee: doctor.consultationFee,
      unavailableDates: doctor.unavailableDates,
    },
    days,
  });
});

// DOCTOR ACTION: Toggle a date as unavailable/available (US-5 item 2 management)
doctorsRouter.post('/my-availability/toggle-date', authenticate, requireRole(['doctor']), (req: Request, res: Response) => {
  const doctor = (req as any).user;
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
  }

  const index = doctor.unavailableDates.indexOf(date);
  let isNowUnavailable = false;

  if (index >= 0) {
    // Already marked unavailable, so remove it (make available)
    doctor.unavailableDates.splice(index, 1);
    isNowUnavailable = false;
  } else {
    // Mark as unavailable
    doctor.unavailableDates.push(date);
    isNowUnavailable = true;
  }

  return res.json({
    message: isNowUnavailable
      ? `Date ${date} has been marked as UNAVAILABLE.`
      : `Date ${date} has been restored to AVAILABLE.`,
    isUnavailable: isNowUnavailable,
    unavailableDates: doctor.unavailableDates,
  });
});
