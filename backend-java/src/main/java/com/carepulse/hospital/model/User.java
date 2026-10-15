package com.carepulse.hospital.model;

import java.time.Instant;

public abstract class User {
    protected String id;
    protected UserRole role;
    protected String name;
    protected String email;
    protected String phone;
    protected String password;
    protected int failedLoginAttempts;
    protected Instant lockUntil;
    protected Instant createdAt;

    public User() {}

    public User(String id, UserRole role, String name, String email, String phone, String password) {
        this.id = id;
        this.role = role;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.failedLoginAttempts = 0;
        this.lockUntil = null;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }

    public Instant getLockUntil() { return lockUntil; }
    public void setLockUntil(Instant lockUntil) { this.lockUntil = lockUntil; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public boolean isLocked() {
        if (lockUntil == null) return false;
        return Instant.now().isBefore(lockUntil);
    }
}
