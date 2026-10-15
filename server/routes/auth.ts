import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { UserRole } from '../types';

export const authRouter = Router();

// Middleware to authenticate Bearer token
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const session = db.getSession(token);

  if (!session) {
    return res.status(401).json({
      error: 'Session expired or invalidated. If you were idle for 15 minutes, please log in again.',
      code: 'SESSION_EXPIRED_IDLE',
    });
  }

  // Attach session and user to request
  (req as any).session = session;
  (req as any).user = db.findUserById(session.userId);
  next();
}

// Middleware for role-based access
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session;
    if (!session || !allowedRoles.includes(session.role)) {
      return res.status(403).json({
        error: `Access Denied: Requires ${allowedRoles.join(' or ')} privileges.`,
        code: 'FORBIDDEN_ROLE',
      });
    }
    next();
  };
}

// ------------------- US-1: PATIENT REGISTRATION -------------------
authRouter.post('/register', (req: Request, res: Response) => {
  const { name, email, phone, dob, password, gender, bloodGroup, emergencyContact } = req.body;

  // 1. Validation: check required fields
  const missingFields: string[] = [];
  if (!name || !name.trim()) missingFields.push('Full Name');
  if (!email || !email.trim()) missingFields.push('Email Address');
  if (!phone || !phone.trim()) missingFields.push('Phone Number');
  if (!dob || !dob.trim()) missingFields.push('Date of Birth (DOB)');
  if (!password || !password.trim()) missingFields.push('Password');

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Validation error: Required fields missing: ${missingFields.join(', ')}.`,
      missingFields,
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      error: 'Invalid email address format. Please enter a valid email.',
      field: 'email',
    });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters long.',
      field: 'password',
    });
  }

  // Check if email already registered
  const existingUser = db.findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      error: 'This email is already registered. Please login or use a different email.',
      code: 'EMAIL_ALREADY_EXISTS',
    });
  }

  // Create new patient
  const newPatient = db.createPatient({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    dob: dob.trim(),
    password: password.trim(),
    gender: gender || 'Unspecified',
    bloodGroup: bloodGroup || 'Unspecified',
    emergencyContact: emergencyContact || '',
  });

  // Automatically create session for smooth onboarding
  const session = db.createSession(newPatient);

  return res.status(201).json({
    message: 'Patient account created successfully! Welcome to CarePulse.',
    patient: {
      id: newPatient.id,
      name: newPatient.name,
      email: newPatient.email,
      phone: newPatient.phone,
      dob: newPatient.dob,
      role: newPatient.role,
    },
    token: session.token,
    session,
  });
});

// ------------------- US-2 & US-3: LOGIN (PATIENT & DOCTOR) -------------------
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password, requestedRole } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Both email and password are required.',
    });
  }

  const user = db.findUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials. No account found with this email.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // Check if account is currently locked (5 failed attempts)
  if (user.lockUntil) {
    const lockTime = new Date(user.lockUntil).getTime();
    const now = Date.now();
    if (now < lockTime) {
      const remainingMinutes = Math.ceil((lockTime - now) / 60000);
      return res.status(423).json({
        error: `Account is temporarily locked due to 5 consecutive failed login attempts for security. Please try again in ${remainingMinutes} minute(s).`,
        code: 'ACCOUNT_LOCKED',
        remainingMinutes,
        lockUntil: user.lockUntil,
      });
    } else {
      // Lock has expired, reset counter
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }
  }

  // Verify password
  if (user.password !== password) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Check if 5 attempts reached
    if (user.failedLoginAttempts >= 5) {
      const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lock
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      return res.status(423).json({
        error: 'Account temporarily locked: 5 failed login attempts reached. Your account is locked for 15 minutes for security.',
        code: 'ACCOUNT_LOCKED',
        failedAttempts: user.failedLoginAttempts,
        remainingMinutes: 15,
        lockUntil: user.lockUntil,
      });
    }

    const attemptsRemaining = 5 - user.failedLoginAttempts;
    return res.status(401).json({
      error: `Invalid credentials. Incorrect password. (${attemptsRemaining} attempt(s) remaining before security lockout).`,
      code: 'INVALID_CREDENTIALS',
      failedAttempts: user.failedLoginAttempts,
      attemptsRemaining,
    });
  }

  // Role validation if specified
  if (requestedRole && user.role !== requestedRole) {
    return res.status(403).json({
      error: `Access Denied: This account is registered as a ${user.role}, not a ${requestedRole}. Please switch to the ${user.role} tab.`,
      code: 'ROLE_MISMATCH',
      userRole: user.role,
    });
  }

  // Successful login: reset failed login attempts
  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  // Create session with 15-min idle tracking
  const session = db.createSession(user);

  return res.json({
    message: `${user.role === 'doctor' ? 'Doctor' : 'Patient'} logged in successfully.`,
    token: session.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ...(user.role === 'patient'
        ? {
            dob: (user as any).dob,
            bloodGroup: (user as any).bloodGroup,
            gender: (user as any).gender,
            emergencyContact: (user as any).emergencyContact,
          }
        : {
            department: (user as any).department,
            qualification: (user as any).qualification,
            room: (user as any).room,
            avatarUrl: (user as any).avatarUrl,
            unavailableDates: (user as any).unavailableDates,
          }),
    },
    session,
  });
});

// Current user profile
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const session = (req as any).session;
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ...(user.role === 'patient'
        ? {
            dob: user.dob,
            bloodGroup: user.bloodGroup,
            gender: user.gender,
            emergencyContact: user.emergencyContact,
          }
        : {
            department: user.department,
            qualification: user.qualification,
            room: user.room,
            avatarUrl: user.avatarUrl,
            unavailableDates: user.unavailableDates,
          }),
    },
    session: {
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
    },
  });
});

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.deleteSession(token);
  }
  return res.json({ message: 'Logged out successfully.' });
});

// Testing helper: Force simulate 15-minute idle timeout on current session
authRouter.post('/simulate-idle', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.expireSession(token);
    return res.json({
      message: 'Doctor session was expired due to 15-minute idle timeout simulation. Next action will be rejected with 401.',
      status: 'EXPIRED',
    });
  }
  return res.status(400).json({ error: 'No active session token provided.' });
});

// Testing helper: Reset failed login attempt lock
authRouter.post('/reset-lock', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const user = db.findUserByEmail(email);
  if (user) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    return res.json({ message: `Security lock reset for ${email}.` });
  }
  return res.status(404).json({ error: 'User not found' });
});
