import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { DayAvailability } from '../../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  CalendarX,
  CalendarCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';

export const DoctorAvailabilityManager: React.FC = () => {
  const { user } = useAuth();
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAvailability = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getDoctorAvailability(user.id);
      setDays(res.days || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [user]);

  const handleToggleDate = async (dateStr: string) => {
    setTogglingDate(dateStr);
    setStatusMessage(null);
    try {
      const res = await api.toggleDoctorDateAvailability(dateStr);
      setStatusMessage(res.message);
      await fetchAvailability();
    } catch (err: any) {
      console.error(err);
    } finally {
      setTogglingDate(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Manage Clinical Schedule & Availability
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Toggle your on-duty availability for the upcoming 7 days. Marking a date as unavailable will immediately
            hide all appointment slots on the patient booking calendar (US-5 Item 2).
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-teal-700 hover:text-teal-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Clinical Availability Rules:</strong> Standard working days offer 8 appointments per day (09:00 AM – 04:15 PM). When you toggle a day to <strong>Unavailable (Day Off)</strong>, patients attempting to schedule on that date will see "Doctor is unavailable on this date" and zero slots will be presented.
        </p>
      </div>

      {/* 7-Days Schedule Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading 7-day schedule...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((day) => {
            const isUnavailable = day.isUnavailable;
            const isToggling = togglingDate === day.date;

            return (
              <div
                key={day.date}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnavailable
                    ? 'border-rose-200 bg-rose-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-slate-400">{day.dayName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isUnavailable
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isUnavailable ? 'Unavailable' : 'Active'}
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="text-base font-bold text-slate-900">{day.formattedDate}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{day.date}</div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 mb-4">
                    {isUnavailable ? (
                      <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                        <CalendarX className="w-3.5 h-3.5" />
                        <span>Day Off / Leave</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>{day.openSlotCount} Open Slots</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggleDate(day.date)}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                    isUnavailable
                      ? 'bg-white border-rose-300 text-rose-700 hover:bg-rose-100/50'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isToggling ? (
                    'Updating...'
                  ) : isUnavailable ? (
                    <>
                      <ToggleLeft className="w-4 h-4 text-rose-600" />
                      <span>Set Available</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                      <span>Mark Day Off</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
