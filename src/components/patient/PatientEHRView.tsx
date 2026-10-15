import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { EHRRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  Stethoscope,
  Activity,
  Pill,
  Heart,
  Thermometer,
  Shield,
  Clock,
  UserCheck,
} from 'lucide-react';

export const PatientEHRView: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<EHRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await api.getPatientRecords(user.id);
        // US-7 Item 2: Chronological order
        setRecords(res.records || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load medical records.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Electronic Health Record (EHR)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official chronological history of clinical diagnoses, verified treatments, vitals, and physician
            prescriptions.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-xl text-xs text-teal-900">
            <div>
              <span className="font-semibold">{user.name}</span>
              <div className="text-[11px] text-teal-700">
                DOB: {user.dob || 'N/A'} • Blood: {user.bloodGroup || 'O+'}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading health records...
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">No Clinical Records On File</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Following your doctor consultations, medical notes, vital recordings, and prescriptions will appear here in
            chronological sequence.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
            <Clock className="w-3.5 h-3.5" />
            Chronological Consultations ({records.length} Recorded Visits)
          </div>

          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 hover:border-slate-300 transition"
            >
              {/* Top metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 flex-shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{rec.diagnosis}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">{rec.attendingDoctorName}</span>
                      <span>•</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium text-[11px]">
                        {rec.department}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <div className="font-semibold text-slate-700 flex items-center sm:justify-end gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(rec.visitDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Updated: {new Date(rec.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Vitals Ribbon */}
              {rec.vitals && (
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" /> Blood Pressure
                    </span>
                    <span className="font-bold text-slate-800">{rec.vitals.bloodPressure || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                      <Activity className="w-3 h-3 text-teal-500" /> Heart Rate
                    </span>
                    <span className="font-bold text-slate-800">{rec.vitals.heartRate || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-500" /> Temperature
                    </span>
                    <span className="font-bold text-slate-800">{rec.vitals.temperature || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">SpO2 (Oxygen)</span>
                    <span className="font-bold text-slate-800">{rec.vitals.oxygenLevel || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Body Weight</span>
                    <span className="font-bold text-slate-800">{rec.vitals.weight || 'N/A'}</span>
                  </div>
                </div>
              )}

              {/* Symptoms & Treatment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Symptoms & Clinical Presentation
                  </h4>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {rec.symptoms || 'None reported.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Treatment Plan & Physician Instructions
                  </h4>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {rec.treatment || 'Standard monitoring protocol.'}
                  </p>
                </div>
              </div>

              {/* Prescriptions */}
              {rec.prescriptions && rec.prescriptions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-teal-600" />
                    Prescribed Medications
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rec.prescriptions.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-teal-50/40 rounded-xl border border-teal-100 text-xs flex items-start justify-between"
                      >
                        <div>
                          <div className="font-bold text-teal-950">{p.medication}</div>
                          <div className="text-slate-600 text-[11px]">
                            {p.dosage} • {p.frequency}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-teal-100/60 text-teal-800 rounded">
                          {p.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Notes */}
              {rec.notes && (
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Physician Clinical Progress Notes</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed italic">
                    "{rec.notes}"
                  </div>
                </div>
              )}

              {/* US-7 Item 3: Timestamped and attributed to doctor */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  Attributed to: <strong className="text-slate-700">{rec.lastUpdatedByDoctorName}</strong>
                </span>
                <span>
                  Timestamped: {new Date(rec.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
