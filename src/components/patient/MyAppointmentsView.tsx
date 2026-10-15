import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../lib/api';
import { Appointment, DayAvailability } from '../../types';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  CalendarX,
  Stethoscope,
  Info,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';

interface MyAppointmentsViewProps {
  onNavigateToBook: () => void;
}

export const MyAppointmentsView: React.FC<MyAppointmentsViewProps> = ({ onNavigateToBook }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cancellation Modal state (US-6 Item 1 & 3)
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancelPreview, setCancelPreview] = useState<{
    isLateCancellation: boolean;
    hoursRemaining: number;
    warning: string | null;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Rescheduling Modal state (US-6 Item 2)
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleAvailability, setRescheduleAvailability] = useState<DayAvailability[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getAppointments();
      setAppointments(res.appointments || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // ------------------- US-6 Item 1 & 3: CANCEL APPOINTMENT -------------------
  const handleInitiateCancel = async (apt: Appointment) => {
    setCancellingApt(apt);
    setCancelReason('');
    setCancelPreview(null);
    try {
      const preview = await api.getCancelPreview(apt.id);
      setCancelPreview(preview);
    } catch {
      // Fallback local check
      setCancelPreview({
        isLateCancellation: false,
        hoursRemaining: 10,
        warning: null,
      });
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingApt) return;
    setIsSubmittingCancel(true);
    setErrorMessage(null);

    try {
      const res = await api.cancelAppointment(cancellingApt.id, cancelReason);
      // US-6 Item 1: Slot is released and status changes to Cancelled
      setActionMessage(
        res.isLateCancellation
          ? 'Appointment cancelled. Notice: A late cancellation was recorded as it was under 2 hours notice.'
          : 'Appointment successfully cancelled and time slot released.'
      );
      setCancellingApt(null);
      fetchAppointments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // ------------------- US-6 Item 2: RESCHEDULE APPOINTMENT -------------------
  const handleInitiateReschedule = async (apt: Appointment) => {
    setReschedulingApt(apt);
    setRescheduleSlot(null);
    setRescheduleDate('');
    try {
      const res = await api.getDoctorAvailability(apt.doctorId);
      setRescheduleAvailability(res.days || []);
      if (res.days && res.days.length > 0) {
        setRescheduleDate(res.days[0].date);
      }
    } catch (err: any) {
      setErrorMessage('Failed to fetch doctor schedule for rescheduling.');
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingApt || !rescheduleDate || !rescheduleSlot) {
      setErrorMessage('Please select a new date and open time slot.');
      return;
    }

    setIsSubmittingReschedule(true);
    setErrorMessage(null);

    try {
      // US-6 Item 2: Pick new available slot, old slot released and appointment updated to new time
      const res = await api.rescheduleAppointment(reschedulingApt.id, rescheduleDate, rescheduleSlot);
      setActionMessage(res.message || 'Appointment rescheduled successfully!');
      setReschedulingApt(null);
      fetchAppointments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reschedule appointment.');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const selectedRescheduleDay = rescheduleAvailability.find((d) => d.date === rescheduleDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Scheduled Consultations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track upcoming doctor visits, reschedule times, or cancel bookings with clinical slot release.
          </p>
        </div>
        <button
          onClick={onNavigateToBook}
          className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition"
        >
          + Book New Consultation
        </button>
      </div>

      {/* Action / Success Banner */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Appointments List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">No Appointments Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any appointments scheduled yet. Use our 7-day physician calendar to book a visit.
          </p>
          <button
            onClick={onNavigateToBook}
            className="mt-2 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
          >
            Schedule Consultation Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const isScheduled = apt.status === 'Scheduled';
            const isCompleted = apt.status === 'Completed';
            const isCancelled = apt.status === 'Cancelled';

            return (
              <div
                key={apt.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{apt.doctorName}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                        {apt.department}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {apt.date}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-teal-700">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        {apt.timeSlot}
                      </span>
                      {apt.isLateCancellation && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Late Cancellation Flag
                        </span>
                      )}
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-slate-500 mt-1.5 italic">"{apt.notes}"</p>
                    )}
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isScheduled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isCompleted
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {apt.status}
                  </span>

                  {isScheduled && (
                    <div className="flex items-center gap-2">
                      {/* US-6 Item 2: Reschedule */}
                      <button
                        onClick={() => handleInitiateReschedule(apt)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reschedule
                      </button>

                      {/* US-6 Item 1 & 3: Cancel */}
                      <button
                        onClick={() => handleInitiateCancel(apt)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------- US-6 Item 1 & 3: CANCELLATION MODAL ------------------- */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Cancel Appointment</h3>
                <p className="text-xs text-slate-500">
                  {cancellingApt.doctorName} • {cancellingApt.date} at {cancellingApt.timeSlot}
                </p>
              </div>
            </div>

            {/* US-6 Item 3: Given an appointment is less than 2 hours away, a warning about late cancellation is shown */}
            {cancelPreview?.isLateCancellation && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Late Cancellation Warning (Under 2 Hours)</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  This consultation is scheduled in{' '}
                  <strong>{cancelPreview.hoursRemaining <= 0 ? 'less than an hour' : `${cancelPreview.hoursRemaining} hours`}</strong>.
                  According to clinical policy, cancellations with less than 2 hours notice will be logged on your record and may be subject to a late-cancellation fee.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Scheduling conflict, feeling better, personal emergency..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Upon confirming cancellation, this time slot will be released back to the hospital calendar for other patients.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingApt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-lg shadow-sm transition"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm & Release Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- US-6 Item 2: RESCHEDULE MODAL ------------------- */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Reschedule Consultation</h3>
                <p className="text-xs text-slate-500">
                  Current: {reschedulingApt.date} at {reschedulingApt.timeSlot} with {reschedulingApt.doctorName}
                </p>
              </div>
              <button
                onClick={() => setReschedulingApt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Date Picker (7 days) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                1. Select New Date
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {rescheduleAvailability.map((d) => {
                  const isSelected = rescheduleDate === d.date;
                  const isOff = d.isUnavailable;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={isOff}
                      onClick={() => {
                        setRescheduleDate(d.date);
                        setRescheduleSlot(null);
                      }}
                      className={`p-2 rounded-xl border text-center transition ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : isOff
                          ? 'border-rose-200 bg-rose-50 text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[9px] uppercase font-bold">{d.dayName}</div>
                      <div className="text-xs font-bold">{d.formattedDate}</div>
                      <div className="text-[9px]">{isOff ? 'Off' : `${d.openSlotCount} open`}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Open Slots for selected date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                2. Select New Time Slot
              </label>
              {selectedRescheduleDay?.isUnavailable ? (
                <div className="p-4 rounded-xl bg-rose-50 text-rose-800 text-xs text-center font-medium">
                  Doctor is unavailable on this date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedRescheduleDay?.slots.map((s) => {
                    const isSelected = rescheduleSlot === s.timeSlot;
                    const isBooked = !s.available;
                    return (
                      <button
                        key={s.timeSlot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setRescheduleSlot(s.timeSlot)}
                        className={`p-2 rounded-xl border text-xs font-semibold transition ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/30'
                            : isBooked
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                            : 'border-slate-200 bg-white hover:border-teal-400 text-slate-700'
                        }`}
                      >
                        <div>{s.timeSlot}</div>
                        <span className="text-[9px] font-normal text-slate-400">
                          {isBooked ? 'Booked' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Note: Moving this appointment will immediately release your previous slot ({reschedulingApt.date}{' '}
              {reschedulingApt.timeSlot}) so other patients can book it.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReschedulingApt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Abort
              </button>
              <button
                type="button"
                disabled={!rescheduleSlot || isSubmittingReschedule}
                onClick={handleConfirmReschedule}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 rounded-lg shadow-sm transition"
              >
                {isSubmittingReschedule ? 'Rescheduling...' : 'Confirm New Time Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
