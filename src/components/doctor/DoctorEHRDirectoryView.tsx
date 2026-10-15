import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { EHRRecord } from '../../types';
import {
  FileText,
  User,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Calendar,
  Clock,
  Lock,
  Unlock,
  AlertOctagon,
  Edit,
  PlusCircle,
  Eye,
  CheckCircle,
  Pill,
  Heart,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { AddEHRRecordModal } from './AddEHRRecordModal';

interface PatientItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  recordsCount: number;
  lastVisitDate: string | null;
  lastDiagnosis: string;
}

export const DoctorEHRDirectoryView: React.FC = () => {
  const { user, login } = useAuth();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [patientRecords, setPatientRecords] = useState<EHRRecord[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // US-3 Item 3: Access Denied State (403)
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<{
    error: string;
    attendingDoctorName?: string;
    recordId?: string;
  } | null>(null);

  // Record modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EHRRecord | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch patient directory
  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const res = await api.getPatientsList();
      setPatients(res.patients || []);
      // Default to first patient if none selected
      if (res.patients && res.patients.length > 0 && !selectedPatient) {
        handleSelectPatient(res.patients[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSelectPatient = async (patient: PatientItem) => {
    setSelectedPatient(patient);
    setAccessDeniedInfo(null);
    setLoadingRecords(true);
    try {
      const res = await api.getPatientRecords(patient.id);
      // US-7 Item 2: Chronological order
      setPatientRecords(res.records || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // US-3 Item 3: Access individual record with strict backend 403 validation
  const handleAttemptRecordAccess = async (recordId: string) => {
    setAccessDeniedInfo(null);
    try {
      const res = await api.getRecordById(recordId);
      // If allowed, we can open for edit or inspection
      setEditingRecord(res.record);
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 403 || err.code === 'PRIVATE_RECORD_ACCESS_DENIED')) {
        // US-3 Item 3: Given a doctor is logged in, when they access another doctor's private patient records, then access is denied!
        setAccessDeniedInfo({
          error: err.message,
          attendingDoctorName: err.data?.attendingDoctorName || 'Authorized Physician',
          recordId,
        });
      } else {
        alert(err.message || 'Error retrieving record.');
      }
    }
  };

  // Helper to switch to Dr. Marcus Chen or Dr. Sarah Jenkins to test access vs denial
  const handleSwitchDoctor = async (email: string) => {
    try {
      await login(email, 'Password123!', 'doctor');
      setAccessDeniedInfo(null);
      setSuccessToast(`Switched account to doctor: ${email}`);
      fetchPatients();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Clinical EHR Directory & Access Control
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Doctor: <strong>{user?.name}</strong> ({user?.department}) • Enforces hospital confidentiality & private
            doctor record protection (US-3 Item 3).
          </p>
        </div>

        {/* Quick Fast-Switch Doctors for testing US-3 #3 */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs">
          <span className="text-[11px] font-semibold text-slate-500 pl-1">Test Doctor Switch:</span>
          <button
            onClick={() => handleSwitchDoctor('sarah.jenkins@hospital.org')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.email === 'sarah.jenkins@hospital.org'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dr. Jenkins (Cardio)
          </button>
          <button
            onClick={() => handleSwitchDoctor('marcus.chen@hospital.org')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.email === 'marcus.chen@hospital.org'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dr. Chen (Neuro)
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

      {/* ------------------- US-3 Item 3: ACCESS DENIED BANNER (HTTP 403) ------------------- */}
      {accessDeniedInfo && (
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-md animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wider text-rose-900">
                  HTTP 403 Forbidden — Access Denied
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded">
                  US-3 Requirement 3 Enforced
                </span>
              </div>
              <p className="text-xs text-rose-900 mt-1 font-medium leading-relaxed">
                {accessDeniedInfo.error}
              </p>
              <div className="mt-3 pt-3 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-rose-700">
                  Current Session: <strong>{user?.name}</strong> • Record Author:{' '}
                  <strong>{accessDeniedInfo.attendingDoctorName}</strong>
                </span>
                <button
                  onClick={() => handleSwitchDoctor('marcus.chen@hospital.org')}
                  className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <span>Switch to Author ({accessDeniedInfo.attendingDoctorName}) to Test Authorized Access</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setAccessDeniedInfo(null)}
              className="text-rose-400 hover:text-rose-700 font-bold p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Patients Directory (4 cols), Right Patient EHR History (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Selection Column */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-teal-600" />
            Patient Hospital Directory
          </h3>

          {loadingPatients ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading patients...
            </div>
          ) : (
            patients.map((pat) => {
              const isSelected = selectedPatient?.id === pat.id;
              const hasPrivateRecord = pat.id === 'pat_2'; // Emily Parker has private record under Dr. Marcus Chen

              return (
                <div
                  key={pat.id}
                  onClick={() => handleSelectPatient(pat)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-teal-600 ring-2 ring-teal-600/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-xs text-teal-800">
                        {pat.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{pat.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          DOB: {pat.dob} • {pat.gender}
                        </span>
                      </div>
                    </div>

                    {hasPrivateRecord && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
                        title="Contains private record under Dr. Marcus Chen"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        Private File
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{pat.recordsCount} Visit Records</span>
                    <span className="truncate max-w-[140px] text-slate-600">{pat.lastDiagnosis}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* EHR Records for Selected Patient Column */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>DOB: {selectedPatient.dob}</span>
                    <span>•</span>
                    <span>Blood Group: {selectedPatient.bloodGroup || 'O+'}</span>
                    <span>•</span>
                    <span>{selectedPatient.email}</span>
                  </div>
                </div>

                {/* US-7 Item 1: Doctor adds diagnosis notes to patient EHR */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  + Add Clinical Consultation
                </button>
              </div>

              {/* Chronological Visits List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  Medical History & Past Consultations (Chronological)
                </h4>

                {loadingRecords ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading EHR records...</div>
                ) : patientRecords.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                    No EHR records found for this patient yet. Use the button above to add the initial consultation.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientRecords.map((rec) => {
                      const isRestricted = rec.isAccessRestricted;
                      const isAuthoredByMe = rec.attendingDoctorId === user?.id;

                      return (
                        <div
                          key={rec.id}
                          className={`rounded-2xl border p-5 transition ${
                            isRestricted
                              ? 'border-rose-300 bg-rose-50/40'
                              : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                            <div className="flex items-center gap-2.5">
                              {isRestricted ? (
                                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                                  <Lock className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                                  <Stethoscope className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <h5 className="font-bold text-sm text-slate-900">
                                  {isRestricted ? 'Restricted Private File (Protected)' : rec.diagnosis}
                                </h5>
                                <div className="text-[11px] text-slate-500">
                                  Doctor: <strong className="text-slate-700">{rec.attendingDoctorName}</strong> (
                                  {rec.department})
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(rec.visitDate).toLocaleDateString()}
                              </span>
                              {rec.privacyLevel === 'private' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Private
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ------------------- US-3 Item 3: RESTRICTED ACCESS CASE ------------------- */}
                          {isRestricted ? (
                            <div className="mt-3 p-4 bg-white rounded-xl border border-rose-200 space-y-2">
                              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                                <AlertOctagon className="w-4 h-4 text-rose-600" />
                                <span>Confidential Medical File: Strictly Restricted Access</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                This consultation was designated as Private by {rec.attendingDoctorName}. According to
                                hospital policy, other doctors cannot view diagnoses or prescriptions in this file.
                              </p>
                              <div className="pt-2 flex items-center gap-3">
                                {/* Clicking this attempts the forbidden call to demonstrate US-3 #3 */}
                                <button
                                  type="button"
                                  onClick={() => handleAttemptRecordAccess(rec.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  Attempt Access (Tests US-3 Item 3 HTTP 403)
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Authorized View */
                            <div className="mt-4 space-y-4 text-xs">
                              {/* Vitals */}
                              {rec.vitals && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200">
                                  <div>
                                    <span className="text-slate-400 block">BP</span>
                                    <span className="font-bold text-slate-800">{rec.vitals.bloodPressure}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Heart Rate</span>
                                    <span className="font-bold text-slate-800">{rec.vitals.heartRate}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Temp</span>
                                    <span className="font-bold text-slate-800">{rec.vitals.temperature}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">SpO2</span>
                                    <span className="font-bold text-slate-800">{rec.vitals.oxygenLevel}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Weight</span>
                                    <span className="font-bold text-slate-800">{rec.vitals.weight}</span>
                                  </div>
                                </div>
                              )}

                              {/* Treatment & Symptoms */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="font-bold text-slate-700 block mb-0.5">Symptoms:</span>
                                  <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                                    {rec.symptoms || 'None recorded.'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-700 block mb-0.5">Treatment Plan:</span>
                                  <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                                    {rec.treatment || 'None recorded.'}
                                  </p>
                                </div>
                              </div>

                              {/* Prescriptions */}
                              {rec.prescriptions && rec.prescriptions.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                                    <Pill className="w-3 h-3 text-teal-600" />
                                    Prescriptions:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {rec.prescriptions.map((pr, pidx) => (
                                      <div
                                        key={pidx}
                                        className="p-2 bg-white rounded-lg border border-slate-200 text-[11px]"
                                      >
                                        <div className="font-bold text-slate-800">{pr.medication}</div>
                                        <div className="text-slate-500">
                                          {pr.dosage} • {pr.frequency} ({pr.duration})
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Doctor attribution & Edit action (US-7 Item 3) */}
                              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                                <span>
                                  Last updated by: <strong>{rec.lastUpdatedByDoctorName}</strong> on{' '}
                                  {new Date(rec.updatedAt).toLocaleString()}
                                </span>

                                <button
                                  onClick={() => setEditingRecord(rec)}
                                  className="px-3 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Update Record (US-7 Item 3)
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Select a patient from the left directory to view full medical history.
            </div>
          )}
        </div>
      </div>

      {/* Add New Record Modal */}
      {isAddModalOpen && selectedPatient && (
        <AddEHRRecordModal
          isOpen={isAddModalOpen}
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(msg) => {
            setIsAddModalOpen(false);
            setSuccessToast(msg);
            handleSelectPatient(selectedPatient);
          }}
        />
      )}

      {/* Edit Record Modal (US-7 Item 3) */}
      {editingRecord && selectedPatient && (
        <AddEHRRecordModal
          isOpen={!!editingRecord}
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          existingRecord={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={(msg) => {
            setEditingRecord(null);
            setSuccessToast(msg);
            handleSelectPatient(selectedPatient);
          }}
        />
      )}
    </div>
  );
};
