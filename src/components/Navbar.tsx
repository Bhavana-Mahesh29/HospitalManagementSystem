import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { NotificationItem } from '../types';
import {
  Activity,
  Calendar,
  Clock,
  LogOut,
  User as UserIcon,
  Bell,
  Stethoscope,
  FileText,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openAuthModal }) => {
  const { user, role, logout, idleSecondsRemaining, isIdleWarningVisible, simulateIdleTimeout, resetIdleTimer } =
    useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Format idle countdown MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">CarePulse</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  EHR & Scheduling
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Clinical Hospital & Patient Portal</p>
            </div>
          </div>

          {/* Navigation links if logged in */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {role === 'patient' ? (
                <>
                  <button
                    onClick={() => setCurrentTab('book')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentTab === 'book'
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Book Appointment
                  </button>
                  <button
                    onClick={() => setCurrentTab('appointments')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentTab === 'appointments'
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    My Appointments
                  </button>
                  <button
                    onClick={() => setCurrentTab('ehr')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentTab === 'ehr'
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Health Records (EHR)
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentTab('doctor-schedule')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentTab === 'doctor-schedule'
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Doctor Schedule
                  </button>
                  <button
                    onClick={() => setCurrentTab('doctor-availability')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentTab === 'doctor-availability'
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Manage Availability
                  </button>
                  <button
                    onClick={() => setCurrentTab('doctor-ehr')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentTab === 'doctor-ehr'
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Patient EHR & Records
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* 15-Minute Session Idle Indicator & Test Simulator */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isIdleWarningVisible ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-mono font-medium">{formatTime(idleSecondsRemaining)}</span>
                  </div>
                  {role === 'doctor' && (
                    <button
                      onClick={simulateIdleTimeout}
                      title="US-3 Item 2: Test automatic logout after 15 minutes of idle session"
                      className="ml-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Test 15m Idle
                    </button>
                  )}
                </div>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifMenu(!showNotifMenu)}
                    className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="In-App Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifMenu && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-teal-600" />
                          <span className="text-sm font-semibold text-slate-800">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                                !n.read ? 'bg-teal-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-800">{n.title}</span>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Badge */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</p>
                    <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-medium capitalize bg-slate-100 text-slate-600">
                      {role === 'doctor' ? `Dr. • ${user.department || 'Physician'}` : 'Patient'}
                    </span>
                  </div>

                  <button
                    onClick={() => logout()}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openAuthModal}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all"
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        {user && (
          <div className="flex md:hidden items-center justify-around border-t border-slate-100 py-2">
            {role === 'patient' ? (
              <>
                <button
                  onClick={() => setCurrentTab('book')}
                  className={`flex flex-col items-center gap-1 text-xs py-1 px-2 rounded ${
                    currentTab === 'book' ? 'text-teal-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Book
                </button>
                <button
                  onClick={() => setCurrentTab('appointments')}
                  className={`flex flex-col items-center gap-1 text-xs py-1 px-2 rounded ${
                    currentTab === 'appointments' ? 'text-teal-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Visits
                </button>
                <button
                  onClick={() => setCurrentTab('ehr')}
                  className={`flex flex-col items-center gap-1 text-xs py-1 px-2 rounded ${
                    currentTab === 'ehr' ? 'text-teal-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Records
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentTab('doctor-schedule')}
                  className={`flex flex-col items-center gap-1 text-xs py-1 px-2 rounded ${
                    currentTab === 'doctor-schedule' ? 'text-teal-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
                <button
                  onClick={() => setCurrentTab('doctor-availability')}
                  className={`flex flex-col items-center gap-1 text-xs py-1 px-2 rounded ${
                    currentTab === 'doctor-availability' ? 'text-teal-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Days Off
                </button>
                <button
                  onClick={() => setCurrentTab('doctor-ehr')}
                  className={`flex flex-col items-center gap-1 text-xs py-1 px-2 rounded ${
                    currentTab === 'doctor-ehr' ? 'text-teal-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  EHR Records
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 15-Minute Idle Warning Banner */}
      {isIdleWarningVisible && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs flex items-center justify-between shadow-inner animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Clinical Inactivity Warning:</strong> You have been idle. Your session will automatically logout in{' '}
              <strong>{idleSecondsRemaining} seconds</strong> to protect patient confidentiality.
            </span>
          </div>
          <button
            onClick={resetIdleTimer}
            className="px-2.5 py-1 bg-white text-amber-900 rounded font-bold hover:bg-amber-50 text-xs transition"
          >
            I am still working
          </button>
        </div>
      )}
    </header>
  );
};
