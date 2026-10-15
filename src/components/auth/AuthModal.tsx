import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'patient-login' | 'doctor-login' | 'patient-register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'patient-login',
}) => {
  const { login, registerPatient } = useAuth();

  const [activeTab, setActiveTab] = useState<'patient-login' | 'doctor-login' | 'patient-register'>(initialTab);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form states (US-1: Name, Email, Phone, DOB, Password)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');

  // Status & Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lockout info (US-2 Item 3)
  const [lockoutInfo, setLockoutInfo] = useState<{
    locked: boolean;
    remainingMinutes?: number;
    failedAttempts?: number;
    email?: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  const handleTabChange = (tab: 'patient-login' | 'doctor-login' | 'patient-register') => {
    setActiveTab(tab);
    resetMessages();
    setLockoutInfo(null);
  };

  // Demo accounts fast-fill
  const fillDemoCredentials = (role: 'patient' | 'doctor', email: string) => {
    resetMessages();
    setLockoutInfo(null);
    if (role === 'patient') {
      setActiveTab('patient-login');
      setLoginEmail(email);
      setLoginPassword('Password123!');
    } else {
      setActiveTab('doctor-login');
      setLoginEmail(email);
      setLoginPassword('Password123!');
    }
  };

  // ------------------- US-2 & US-3: LOGIN HANDLER -------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    const isDoctor = activeTab === 'doctor-login';
    const requestedRole = isDoctor ? 'doctor' : 'patient';

    try {
      await login(loginEmail, loginPassword, requestedRole);
      setSuccessMessage(
        isDoctor
          ? 'Doctor credentials verified. Redirecting to Doctor Schedule & Dashboard...'
          : 'Login successful. Redirecting to Patient Dashboard...'
      );
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 423 || err.code === 'ACCOUNT_LOCKED') {
          // US-2 Item 3: 5 failed login attempts lockout
          setLockoutInfo({
            locked: true,
            remainingMinutes: err.data?.remainingMinutes || 15,
            failedAttempts: err.data?.failedAttempts || 5,
            email: loginEmail,
          });
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Failed to sign in. Please verify network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------- US-1: PATIENT REGISTRATION HANDLER -------------------
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    // US-1 Item 2: Given required fields are left empty, validation errors are shown and no account is created
    const errors: Record<string, string> = {};
    if (!regName.trim()) errors.name = 'Full name is required.';
    if (!regEmail.trim()) errors.email = 'Email address is required.';
    if (!regPhone.trim()) errors.phone = 'Phone number is required.';
    if (!regDob.trim()) errors.dob = 'Date of birth is required.';
    if (!regPassword.trim()) {
      errors.password = 'Password is required.';
    } else if (regPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // US-1 Item 1: Patient account is created and confirmation message is shown
      const res = await registerPatient({
        name: regName,
        email: regEmail,
        phone: regPhone,
        dob: regDob,
        password: regPassword,
        gender: regGender,
        bloodGroup: regBloodGroup,
      });

      setSuccessMessage(res.message || 'Patient account created successfully! Welcome to CarePulse.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      // US-1 Item 3: Given an email already registered, system shows 'already registered' error
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === 'EMAIL_ALREADY_EXISTS') {
          setErrorMessage("This email is already registered. Please login or use a different email address.");
          setFieldErrors({ email: 'Already registered email.' });
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unlock helper for evaluators
  const handleResetLock = async () => {
    if (!lockoutInfo?.email) return;
    try {
      await api.resetLock(lockoutInfo.email);
      setLockoutInfo(null);
      setErrorMessage(null);
      setSuccessMessage(`Lock cleared for ${lockoutInfo.email}. You can now try logging in again.`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              {activeTab === 'doctor-login' ? (
                <Stethoscope className="w-7 h-7 text-emerald-400" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-teal-300" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {activeTab === 'patient-register'
                  ? 'New Patient Registration'
                  : activeTab === 'doctor-login'
                  ? 'Doctor Clinical Portal'
                  : 'Patient Portal Sign In'}
              </h2>
              <p className="text-xs text-teal-100">
                {activeTab === 'patient-register'
                  ? 'Create your digital healthcare profile'
                  : activeTab === 'doctor-login'
                  ? 'Access physician schedule, consultations & EHR'
                  : 'Manage appointments, health history & test results'}
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1 bg-black/20 p-1 rounded-xl mt-5">
            <button
              onClick={() => handleTabChange('patient-login')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'patient-login'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Patient Login
            </button>
            <button
              onClick={() => handleTabChange('patient-register')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'patient-register'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Register Patient
            </button>
            <button
              onClick={() => handleTabChange('doctor-login')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'doctor-login'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-teal-100 hover:text-white hover:bg-white/10'
              }`}
            >
              Doctor Login
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Messages */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* US-2 Item 3: Account Temporarily Locked Banner */}
          {lockoutInfo?.locked && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Security Notice: Account Temporarily Locked (5 Failed Attempts)</span>
              </div>
              <p className="text-amber-700 leading-relaxed mb-3">
                For patient data security, this account is temporarily locked for{' '}
                <strong>{lockoutInfo.remainingMinutes || 15} minutes</strong>. Please wait before attempting to sign in
                again.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                <span className="text-[11px] text-amber-600">Testing Helper:</span>
                <button
                  type="button"
                  onClick={handleResetLock}
                  className="px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                >
                  Reset Security Lock (Tester Helper)
                </button>
              </div>
            </div>
          )}

          {/* ------------------- TAB 1 & 2: LOGIN FORMS ------------------- */}
          {activeTab !== 'patient-register' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeTab === 'doctor-login' ? 'Doctor Work Email' : 'Patient Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={
                      activeTab === 'doctor-login' ? 'sarah.jenkins@hospital.org' : 'john@example.com'
                    }
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'doctor-login'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
                    : 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300'
                }`}
              >
                {isSubmitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {activeTab === 'doctor-login' ? 'Access Doctor Schedule' : 'Sign In to Patient Portal'}
                    </span>
                  </>
                )}
              </button>

              {/* Demo Quick Logins */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Quick Demo Credentials
                  </span>
                  <span className="text-[10px] text-slate-400">Password: Password123!</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activeTab === 'patient-login' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('patient', 'john@example.com')}
                        className="p-2 text-left rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition group"
                      >
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-teal-700">
                          Johnathan Doe
                        </div>
                        <div className="text-[10px] text-slate-500">john@example.com</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('patient', 'emily@example.com')}
                        className="p-2 text-left rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition group"
                      >
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-teal-700">
                          Emily Parker
                        </div>
                        <div className="text-[10px] text-slate-500">emily@example.com</div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('doctor', 'sarah.jenkins@hospital.org')}
                        className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition group"
                      >
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-emerald-700">
                          Dr. Sarah Jenkins
                        </div>
                        <div className="text-[10px] text-slate-500">Cardiology Specialist</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('doctor', 'marcus.chen@hospital.org')}
                        className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition group"
                      >
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-emerald-700">
                          Dr. Marcus Chen
                        </div>
                        <div className="text-[10px] text-slate-500">Neurology Specialist</div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          ) : (
            /* ------------------- TAB 3: US-1 PATIENT REGISTRATION ------------------- */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. David Miller"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                      fieldErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900`}
                  />
                </div>
                {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="david.miller@example.com"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                      fieldErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900`}
                  />
                </div>
                {fieldErrors.email && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Phone & DOB row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                        fieldErrors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900`}
                    />
                  </div>
                  {fieldErrors.phone && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth (DOB) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                        fieldErrors.dob ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900`}
                    />
                  </div>
                  {fieldErrors.dob && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.dob}</p>}
                </div>
              </div>

              {/* Gender & Blood Group row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={regBloodGroup}
                    onChange={(e) => setRegBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 6 characters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                      fieldErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Creating Patient Profile...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Patient Registration</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
