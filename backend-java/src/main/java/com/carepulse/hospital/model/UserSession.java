package com.carepulse.hospital.model;

import java.time.Duration;
import java.time.Instant;

public class UserSession {
    public static final Duration IDLE_TIMEOUT = Duration.ofMinutes(15);

    private String token;
    private String userId;
    private UserRole role;
    private String email;
    private String name;
    private Instant createdAt;
    private Instant lastActiveAt;
    private Instant expiresAt;

    public UserSession() {}

    public UserSession(String token, String userId, UserRole role, String email, String name) {
        this.token = token;
        this.userId = userId;
        this.role = role;
        this.email = email;
        this.name = name;
        this.createdAt = Instant.now();
        this.lastActiveAt = Instant.now();
        this.expiresAt = this.lastActiveAt.plus(IDLE_TIMEOUT);
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public void touch() {
        this.lastActiveAt = Instant.now();
        this.expiresAt = this.lastActiveAt.plus(IDLE_TIMEOUT);
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
