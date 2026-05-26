package com.multiservice.business.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Account entity representing a financial account.
 * Each account belongs to a user and holds a balance in a specific currency.
 */
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String accountId;

    @Column(nullable = false)
    private String userId;

    // Account type: CHECKING, SAVINGS, CREDIT
    @Column(nullable = false)
    private String accountType;

    @Column(nullable = false)
    private double balance = 0.0;

    @Column(nullable = false)
    private String currency = "USD";

    // Status: ACTIVE, FROZEN, CLOSED
    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Default constructor required by JPA
    public Account() {}

    public Account(String userId, String accountType, double balance, String currency) {
        this.userId = userId;
        this.accountType = accountType;
        this.balance = balance;
        this.currency = currency;
    }

    // Getters and setters
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public double getBalance() { return balance; }
    public void setBalance(double balance) { this.balance = balance; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
