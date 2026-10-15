import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../lib/api';
import { Doctor, DayAvailability, TimeSlotInfo } from '../../types';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Award,
  MapPin,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  DollarSign,
  Stethoscope,
  CalendarX,
  Sparkles,
} from 'lucide-react';

interface BookAppointmentViewProps {
  onBookingSuccess: () => void;
  openAuthModal: () => void;
  isLoggedIn: boolean;
}

export const BookAppointmentView: React.FC<BookAppointmentViewProps> = ({
  onBookingSuccess,
  openAuthModal,
  isLoggedIn,
}) => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // 7-day availability data
  const [availabilityDays, setAvailabilityDays] = useState<DayAvailability[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  // Booking step
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch departments & doctors on mount or department change
  useEffect(() => {
    const init = async () => {
      try {
        const deptRes = await api.getDepartments();
        setDepartments(deptRes.departments || []);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Fetch doctors whenever department changes
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const res = await api.getDoctors(
          selectedDepartment !== 'All Departments' ? selectedDepartment : undefined
        );
        setDoctors(res.doctors || []);

        // Auto select first doctor if current selected is no longer in list
        if (res.doctors && res.doctors.length > 0) {
          if (!selectedDoctor || !res.doctors.some((d: Doctor) => d.id === selectedDoctor.id)) {
            handleSelectDoctor(res.doctors[0]);
          }
        } else {
          setSelectedDoctor(null);
          setAvailabilityDays([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [selectedDepartment]);

  // Load doctor availability
  const loadDoctorAvailability = async (doctorId: string) => {
    setLoadingAvailability(true);
    setErrorMessage(null);
    try {
      const res = await api.getDoctorAvailability(doctorId);
      setAvailabilityDays(res.days || []);
      if (res.days && res.days.length > 0) {
        // default to first day or keep selected date if valid
        const dateMatch = res.days.find((d: DayAvailability) => d.date === selectedDateStr);
        if (!dateMatch) {
          setSelectedDateStr(res.days[0].date);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setBookingSuccessData(null);
    setErrorMessage(null);
    loadDoctorAvailability(doctor.id);
  };

  // US-5 Item 3: Given the patient changes the selected date, when the calendar updates, availability refreshes without full page reload
  const handleDateChange = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedSlot(null); // Clear selected slot for new date
    setErrorMessage(null);
  };

  // Find availability object for the currently selected date
  const currentDayData = availabilityDays.find((d) => d.date === selectedDateStr);

  // US-4: Confirm appointment booking
  const handleConfirmBooking = async () => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }

    if (!selectedDoctor || !selectedDateStr || !selectedSlot) {
      setErrorMessage('Please select a doctor, date, and available time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.bookAppointment({
        doctorId: selectedDoctor.id,
        date: selectedDateStr,
        timeSlot: selectedSlot,
        notes: bookingNotes,
      });

      // US-4 Item 1 & 3: Appointment created and confirmation notification sent
      setBookingSuccessData(res);
      // Refresh availability to reflect booked slot
      loadDoctorAvailability(selectedDoctor.id);
      setSelectedSlot(null);
      setBookingNotes('');
      onBookingSuccess();
    } catch (err: any) {
      if (err instanceof ApiError) {
        // US-4 Item 2: Slot already booked
        setErrorMessage(err.message || 'Selected slot is unavailable. Please choose another.');
        // Refresh availability
        loadDoctorAvailability(selectedDoctor.id);
      } else {
        setErrorMessage('Failed to complete booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Seamless 7-Day Specialist Booking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Schedule a Consultation with Board-Certified Physicians
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Filter by clinical specialty, view verified real-time open slots for the next 7 days, and receive instant
            in-app confirmation.
          </p>
        </div>
      </div>

      {/* Booking Success Alert */}
      {bookingSuccessData && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-start gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="p-2 rounded-xl bg-emerald-600 text-white flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-emerald-950">
              {bookingSuccessData.message || 'Appointment Confirmed!'}
            </h3>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Your appointment with{' '}
              <strong>{bookingSuccessData.appointment?.doctorName}</strong> ({bookingSuccessData.appointment?.department})
              is scheduled for <strong>{bookingSuccessData.appointment?.date}</strong> at{' '}
              <strong>{bookingSuccessData.appointment?.timeSlot}</strong>.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              ✓ Confirmation notification delivered to your patient notification tray and recorded in 'My Appointments'.
            </p>
          </div>
          <button
            onClick={() => setBookingSuccessData(null)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ------------------- US-5 Item 1: DEPARTMENT FILTER ------------------- */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">Select Clinical Department</h3>
          </div>
          <span className="text-xs text-slate-500">Showing {doctors.length} doctors available</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDepartment === dept
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Left Doctors List, Right Doctor Availability & Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Doctor Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            Available Physicians
          </h3>

          {loadingDoctors ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading clinical specialists...
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No doctors found in this department.
            </div>
          ) : (
            doctors.map((doc) => {
              const isSelected = selectedDoctor?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                    isSelected
                      ? 'border-teal-600 ring-2 ring-teal-600/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={doc.avatarUrl}
                      alt={doc.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">{doc.name}</h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700">
                            {doc.department}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 flex items-center">
                          ${doc.consultationFee}
                          <span className="text-[10px] text-slate-400 font-normal ml-0.5">/visit</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{doc.bio}</p>

                      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {doc.room}
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-slate-400" />
                          {doc.experienceYears}y exp
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: 7-Day Availability & Time Slot Picker (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedDoctor ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Doctor Details Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedDoctor.name}</h3>
                  <p className="text-xs text-slate-500">{selectedDoctor.qualification}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Location</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedDoctor.room}</span>
                </div>
              </div>

              {/* ------------------- US-5 Item 1: NEXT 7 DAYS CALENDAR ------------------- */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                    Available Dates (Next 7 Days)
                  </h4>
                  <span className="text-[11px] text-slate-500">Pick a day to view slots</span>
                </div>

                {loadingAvailability ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading schedule...</div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {availabilityDays.map((day) => {
                      const isSelected = selectedDateStr === day.date;
                      const isOff = day.isUnavailable;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => handleDateChange(day.date)}
                          className={`p-2.5 rounded-xl border text-center transition-all relative flex flex-col items-center justify-center ${
                            isSelected
                              ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/20'
                              : isOff
                              ? 'border-rose-200 bg-rose-50/60 text-slate-400 hover:border-rose-300'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span
                            className={`text-[10px] uppercase font-bold ${
                              isSelected ? 'text-teal-100' : isOff ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            {day.dayName}
                          </span>
                          <span className="text-xs font-bold my-0.5">{day.formattedDate}</span>

                          {/* US-5 Item 2: Unavailable day indicator */}
                          {isOff ? (
                            <span
                              className={`text-[9px] font-semibold ${
                                isSelected ? 'text-white' : 'text-rose-500'
                              }`}
                            >
                              Day Off
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] ${
                                isSelected ? 'text-teal-100' : 'text-teal-600'
                              } font-medium`}
                            >
                              {day.openSlotCount} open
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ------------------- US-5 Item 2 & US-4 Item 2: TIME SLOTS ------------------- */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    Available Time Slots for {selectedDateStr}
                  </h4>
                  {currentDayData && !currentDayData.isUnavailable && (
                    <span className="text-[11px] text-teal-700 font-medium">
                      {currentDayData.openSlotCount} slot(s) available
                    </span>
                  )}
                </div>

                {/* US-5 Item 2: Given a doctor has marked a day as unavailable, when a patient views that date, then NO slots are shown for that day */}
                {currentDayData?.isUnavailable ? (
                  <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                    <CalendarX className="w-8 h-8 text-rose-500 mx-auto" />
                    <h5 className="font-bold text-sm text-rose-900">Doctor is Unavailable on this Date</h5>
                    <p className="text-xs text-rose-700 max-w-sm mx-auto leading-relaxed">
                      {selectedDoctor.name} has marked this day as unavailable (scheduled leave or clinical rounds).
                      Please select another date from the 7-day calendar above.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentDayData?.slots.map((slot) => {
                      const isSelected = selectedSlot === slot.timeSlot;
                      const isBooked = !slot.available;

                      return (
                        <button
                          key={slot.timeSlot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedSlot(slot.timeSlot)}
                          className={`p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/30 shadow-sm'
                              : isBooked
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/30 text-slate-700'
                          }`}
                        >
                          <span className={isBooked ? 'line-through' : ''}>{slot.timeSlot}</span>
                          <span
                            className={`text-[10px] font-normal ${
                              isBooked ? 'text-slate-400' : isSelected ? 'text-teal-700 font-bold' : 'text-emerald-600'
                            }`}
                          >
                            {/* US-4 Item 2: Given a slot is already booked, it is shown as unavailable */}
                            {isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Consultation Notes & Booking Confirmation */}
              {selectedSlot && !currentDayData?.isUnavailable && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Consultation / Symptoms (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Describe primary symptoms or reason for visit (e.g., headache, blood pressure checkup, joint soreness)..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                    />
                  </div>

                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {selectedDoctor.name} • {selectedSlot}
                      </div>
                      <div className="text-slate-500">{selectedDateStr}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">${selectedDoctor.consultationFee}</span>
                      <span className="text-[10px] text-slate-400 block">Consultation Fee</span>
                    </div>
                  </div>

                  {/* US-4 Item 1: Confirm Booking Button */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmBooking}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Reserving Slot & Creating Appointment...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm Appointment Booking</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Select a doctor from the left to view 7-day schedule and book an appointment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
