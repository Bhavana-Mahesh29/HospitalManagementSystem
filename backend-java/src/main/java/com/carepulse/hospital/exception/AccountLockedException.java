package com.carepulse.hospital.exception;

import java.time.Instant;

public class AccountLockedException extends RuntimeException {
    private final Instant lockUntil;
    private final int remainingMinutes;

    public AccountLockedException(String message, Instant lockUntil, int remainingMinutes) {
        super(message);
        this.lockUntil = lockUntil;
        this.remainingMinutes = remainingMinutes;
    }

    public Instant getLockUntil() { return lockUntil; }
    public int getRemainingMinutes() { return remainingMinutes; }
}
