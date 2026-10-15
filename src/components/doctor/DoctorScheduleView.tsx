import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Appointment, EHRRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  FilePlus,
  AlertCircle,
  CalendarCheck,
  Search,
  Filter,
} from 'lucide-react';
import { AddEHRRecordModal } from './AddEHRRecordModal';

export const DoctorScheduleView: React.FC<{ onNavigateToAvailability: () => void }> = ({
  onNavigateToAvailability,
}) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add EHR Record modal state
  const [selectedAptForEHR, setSelectedAptForEHR] = useState<Appointment | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.getAppointments();
      setAppointments(res.appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((apt) => {
    // Filter period
    if (filterPeriod === 'today' && apt.date !== todayStr) return false;
    if (filterPeriod === 'upcoming') {
      if (apt.date < todayStr || apt.status !== 'Scheduled') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        apt.patientName.toLowerCase().includes(q) ||
        apt.patientEmail.toLowerCase().includes(q) ||
        apt.timeSlot.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Doctor Dashboard Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Physician Consultation Schedule
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong>{user?.name}</strong> • {user?.department} • Room {user?.room}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToAvailability}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            Manage Available Days
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterPeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterPeriod === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setFilterPeriod('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterPeriod === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Visits ({appointments.filter((a) => a.date === todayStr).length})
          </button>
          <button
            onClick={() => setFilterPeriod('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterPeriod === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming Scheduled
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
          />
        </div>
      </div>

      {/* Schedule Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading doctor schedule...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-sm text-slate-700">No Consultations Found</h4>
          <p className="text-xs text-slate-400">No scheduled appointments matching the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const isToday = apt.date === todayStr;
            const isCompleted = apt.status === 'Completed';
            const isCancelled = apt.status === 'Cancelled';

            return (
              <div
                key={apt.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isToday
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-teal-50 text-teal-700 border border-teal-100'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{apt.patientName}</h4>
                      {isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Today's Patient
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{apt.patientEmail}</span>
                      <span>•</span>
                      <span>{apt.patientPhone}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {apt.date}
                      </span>
                      <span className="flex items-center gap-1 text-teal-700">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        {apt.timeSlot}
                      </span>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">Patient Note:</span> {apt.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status & EHR Action */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      apt.status === 'Scheduled'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isCompleted
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {apt.status}
                  </span>

                  {/* US-7 Item 1: Complete consultation & add diagnosis notes */}
                  {apt.status === 'Scheduled' && (
                    <button
                      onClick={() => setSelectedAptForEHR(apt)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      Add EHR Diagnosis
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* US-7 Item 1 & 3: Add EHR Notes Modal */}
      {selectedAptForEHR && (
        <AddEHRRecordModal
          isOpen={!!selectedAptForEHR}
          patientId={selectedAptForEHR.patientId}
          patientName={selectedAptForEHR.patientName}
          appointmentId={selectedAptForEHR.id}
          onClose={() => setSelectedAptForEHR(null)}
          onSuccess={(msg) => {
            setSelectedAptForEHR(null);
            setSuccessToast(msg);
            fetchSchedule();
          }}
        />
      )}
    </div>
  );
};
