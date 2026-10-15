import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken, ApiError } from '../lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  idleSecondsRemaining: number;
  isIdleWarningVisible: boolean;
  login: (email: string, password: string, requestedRole?: UserRole) => Promise<User>;
  registerPatient: (data: any) => Promise<{ patient: any; message: string }>;
  logout: (reason?: string) => Promise<void>;
  simulateIdleTimeout: () => Promise<void>;
  resetIdleTimer: () => void;
  refreshUser: () => Promise<void>;
  logoutReason: string | null;
  clearLogoutReason: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 15 minutes in seconds
const IDLE_TIMEOUT_SECONDS = 15 * 60; // 900 seconds
// Warning threshold: 1 minute before expiry (60 seconds)
const IDLE_WARNING_SECONDS = 60;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState<number>(IDLE_TIMEOUT_SECONDS);
  const [isIdleWarningVisible, setIsIdleWarningVisible] = useState<boolean>(false);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const idleIntervalRef = useRef<any>(null);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleSecondsRemaining(IDLE_TIMEOUT_SECONDS);
    setIsIdleWarningVisible(false);
  }, []);

  const logout = useCallback(async (reason?: string) => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      removeStoredToken();
      setToken(null);
      setUser(null);
      if (reason) {
        setLogoutReason(reason);
      }
      resetIdleTimer();
    }
  }, [resetIdleTimer]);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 401 || err.code === 'SESSION_EXPIRED_IDLE')) {
        logout('Your session expired due to 15 minutes of inactivity.');
      } else {
        removeStoredToken();
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Initial user check
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Activity listeners for 15-minute doctor idle detection (US-3 Item 2)
  useEffect(() => {
    if (!user) {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      return;
    }

    const handleUserActivity = () => {
      // Only reset if active
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Interval ticker every 1 second
    idleIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, IDLE_TIMEOUT_SECONDS - elapsedSeconds);

      setIdleSecondsRemaining(remaining);

      // Warning when <= 60 seconds
      if (remaining <= IDLE_WARNING_SECONDS && remaining > 0) {
        setIsIdleWarningVisible(true);
      } else {
        setIsIdleWarningVisible(false);
      }

      // If timed out (15 mins idle)
      if (remaining === 0) {
        clearInterval(idleIntervalRef.current);
        logout('Doctor session was idle for 15 minutes. Automatically logged out for clinical security.');
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [user, logout]);

  const login = async (email: string, password: string, requestedRole?: UserRole): Promise<User> => {
    const res = await api.login({ email, password, requestedRole });
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setLogoutReason(null);
    resetIdleTimer();
    return res.user;
  };

  const registerPatient = async (data: any) => {
    const res = await api.register(data);
    if (res.token && res.patient) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.patient);
      setLogoutReason(null);
      resetIdleTimer();
    }
    return { patient: res.patient, message: res.message };
  };

  // US-3 Item 2 Test Simulator
  const simulateIdleTimeout = async () => {
    try {
      await api.simulateIdle();
    } catch {
      // ignore
    }
    logout('Doctor session was idle for 15 minutes. Automatically logged out for clinical security (15-min idle simulation).');
  };

  const clearLogoutReason = () => setLogoutReason(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        token,
        isLoading,
        idleSecondsRemaining,
        isIdleWarningVisible,
        login,
        registerPatient,
        logout,
        simulateIdleTimeout,
        resetIdleTimer,
        refreshUser,
        logoutReason,
        clearLogoutReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
