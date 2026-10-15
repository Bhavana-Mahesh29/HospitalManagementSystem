import React, { useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  FilePlus,
  Stethoscope,
  Heart,
  Pill,
  Plus,
  Trash2,
  ShieldCheck,
  Clock,
  UserCheck,
} from 'lucide-react';

interface AddEHRRecordModalProps {
  isOpen: boolean;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  existingRecord?: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AddEHRRecordModal: React.FC<AddEHRRecordModalProps> = ({
  isOpen,
  patientId,
  patientName,
  appointmentId,
  existingRecord,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const isEditing = !!existingRecord;

  const [diagnosis, setDiagnosis] = useState(existingRecord?.diagnosis || '');
  const [symptoms, setSymptoms] = useState(existingRecord?.symptoms || '');
  const [treatment, setTreatment] = useState(existingRecord?.treatment || '');
  const [notes, setNotes] = useState(existingRecord?.notes || '');
  const [privacyLevel, setPrivacyLevel] = useState<'standard' | 'private'>(
    existingRecord?.privacyLevel || 'standard'
  );

  // Vitals
  const [bp, setBp] = useState(existingRecord?.vitals?.bloodPressure || '120/80 mmHg');
  const [hr, setHr] = useState(existingRecord?.vitals?.heartRate || '72 bpm');
  const [temp, setTemp] = useState(existingRecord?.vitals?.temperature || '98.6 °F');
  const [spo2, setSpo2] = useState(existingRecord?.vitals?.oxygenLevel || '99%');
  const [weight, setWeight] = useState(existingRecord?.vitals?.weight || '72 kg');

  // Prescriptions list
  const [prescriptions, setPrescriptions] = useState<
    Array<{ medication: string; dosage: string; frequency: string; duration: string }>
  >(
    existingRecord?.prescriptions || [
      { medication: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'Three times daily', duration: '7 days' },
    ]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddPrescription = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medication: '', dosage: '', frequency: 'Once daily', duration: '14 days' },
    ]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrescriptionChange = (index: number, field: string, val: string) => {
    setPrescriptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setErrorMessage('Diagnosis is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      diagnosis: diagnosis.trim(),
      symptoms: symptoms.trim(),
      treatment: treatment.trim(),
      prescriptions: prescriptions.filter((p) => p.medication.trim()),
      vitals: {
        bloodPressure: bp,
        heartRate: hr,
        temperature: temp,
        oxygenLevel: spo2,
        weight: weight,
      },
      notes: notes.trim(),
      privacyLevel,
      appointmentId,
    };

    try {
      if (isEditing) {
        // US-7 Item 3: Update EHR record (timestamped and attributed to doctor)
        const res = await api.updateEHRRecord(existingRecord.id, payload);
        onSuccess(res.message || 'Record successfully updated and attributed to physician.');
      } else {
        // US-7 Item 1: Add diagnosis notes to patient's medical history
        const res = await api.addEHRRecord(patientId, payload);
        onSuccess(
          res.message || 'Consultation diagnosis notes successfully recorded and saved to patient EHR.'
        );
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save medical record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isEditing ? 'Update Patient EHR Record' : 'Record Clinical Consultation Notes'}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <strong className="text-slate-800">{patientName}</strong> • Attending:{' '}
                <strong className="text-teal-700">{user?.name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Diagnosis */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Primary Diagnosis / Clinical Findings <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Bacterial Sinusitis, Stage 1 Hypertension, Type 2 Diabetes follow-up"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900"
            />
          </div>

          {/* Symptoms & Presentation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Presenting Symptoms & History of Present Illness
            </label>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Patient reports bilateral headache, facial sinus pressure for 5 days, purulent nasal discharge..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
            />
          </div>

          {/* Treatment Plan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Treatment Plan & Clinical Directives
            </label>
            <textarea
              rows={2}
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="e.g. 10-day oral antibiotic course, adequate hydration, saline sinus rinses, follow-up in 2 weeks..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
            />
          </div>

          {/* Vitals Recording Grid */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Patient Vital Signs Recorded
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">BP (mmHg)</label>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Heart Rate</label>
                <input
                  type="text"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Temp (°F)</label>
                <input
                  type="text"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">SpO2</label>
                <input
                  type="text"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Weight</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-teal-600" />
                Prescriptions & Dosages
              </label>
              <button
                type="button"
                onClick={handleAddPrescription}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medication
              </button>
            </div>

            <div className="space-y-2">
              {prescriptions.map((p, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Medication name"
                      value={p.medication}
                      onChange={(e) => handlePrescriptionChange(idx, 'medication', e.target.value)}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={p.dosage}
                      onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Frequency (e.g. Twice daily)"
                      value={p.frequency}
                      onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-1">
                    <input
                      type="text"
                      placeholder="Duration"
                      value={p.duration}
                      onChange={(e) => handlePrescriptionChange(idx, 'duration', e.target.value)}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-200 text-xs"
                    />
                    {prescriptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePrescription(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Level Toggle (US-3 Item 3 support) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Record Access Level</span>
              <span className="text-[11px] text-slate-500">
                {privacyLevel === 'private'
                  ? 'Private Record: Restricted strictly to you. Other doctors will be denied access.'
                  : 'Standard: Accessible to hospital clinical team.'}
              </span>
            </div>
            <select
              value={privacyLevel}
              onChange={(e: any) => setPrivacyLevel(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="standard">Standard Record</option>
              <option value="private">Private (Restricted)</option>
            </select>
          </div>

          {/* Doctor Attribution and Timestamp preview */}
          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 text-[11px] text-teal-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-teal-600" />
              Attribution: <strong>{user?.name}</strong> ({user?.department})
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Auto-timestamp on save
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Saving Medical Record...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isEditing ? 'Save & Timestamp Changes' : 'Save Diagnosis to EHR'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
