package com.multiservice.business.service;

import com.multiservice.business.model.Account;
import com.multiservice.business.model.TransactionRecord;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Service layer for processing financial transactions.
 * Integrates with the fraud detection service via gRPC to validate
 * transactions before execution, and logs all activity to the Go logging service.
 */
@Service
public class TransactionService {

    private static final Logger logger = LoggerFactory.getLogger(TransactionService.class);

    // In-memory storage for demo purposes (would use JPA repositories in production)
    private final Map<String, Account> accounts = new ConcurrentHashMap<>();
    private final Map<String, TransactionRecord> transactions = new ConcurrentHashMap<>();
    private final Map<String, List<TransactionRecord>> accountTransactions = new ConcurrentHashMap<>();

    public TransactionService() {
        // Initialize with sample data for demonstration
        initializeSampleData();
    }

    /**
     * Process a transaction with fraud check integration.
     * Steps: validate accounts -> check fraud -> debit/credit -> record transaction.
     */
    public TransactionRecord processTransaction(String fromAccountId, String toAccountId,
                                                 double amount, String currency,
                                                 String description) {
        logger.info("Processing transaction: {} -> {}, amount={} {}",
                fromAccountId, toAccountId, amount, currency);

        // Validate source account exists and has sufficient funds
        Account fromAccount = accounts.get(fromAccountId);
        if (fromAccount == null) {
            throw new IllegalArgumentException("Source account not found: " + fromAccountId);
        }
        if (fromAccount.getBalance() < amount) {
            throw new IllegalArgumentException("Insufficient funds in account: " + fromAccountId);
        }

        // Validate destination account exists
        Account toAccount = accounts.get(toAccountId);
        if (toAccount == null) {
            throw new IllegalArgumentException("Destination account not found: " + toAccountId);
        }

        // Create transaction record
        TransactionRecord txn = new TransactionRecord(
                fromAccountId, toAccountId, amount, currency, description);
        txn.setTransactionId(UUID.randomUUID().toString());

        // Simulate fraud check (in production, this calls the Python ML service via gRPC)
        boolean isFraudulent = simulateFraudCheck(amount, fromAccountId);
        if (isFraudulent) {
            txn.setStatus("BLOCKED");
            logger.warn("Transaction BLOCKED by fraud detection: {}", txn.getTransactionId());
        } else {
            // Execute the transaction: debit source, credit destination
            fromAccount.setBalance(fromAccount.getBalance() - amount);
            toAccount.setBalance(toAccount.getBalance() + amount);
            txn.setStatus("COMPLETED");
            logger.info("Transaction COMPLETED: {}", txn.getTransactionId());
        }

        // Store the transaction record
        transactions.put(txn.getTransactionId(), txn);
        accountTransactions.computeIfAbsent(fromAccountId, k -> new ArrayList<>()).add(txn);
        accountTransactions.computeIfAbsent(toAccountId, k -> new ArrayList<>()).add(txn);

        return txn;
    }

    /**
     * Retrieve account details by ID.
     */
    public Account getAccount(String accountId) {
        Account account = accounts.get(accountId);
        if (account == null) {
            throw new IllegalArgumentException("Account not found: " + accountId);
        }
        return account;
    }

    /**
     * List all accounts belonging to a user.
     */
    public List<Account> listAccountsByUser(String userId) {
        return accounts.values().stream()
                .filter(a -> a.getUserId().equals(userId))
                .toList();
    }

    /**
     * Get paginated transaction history for an account.
     */
    public List<TransactionRecord> getTransactionHistory(String accountId, int page, int pageSize) {
        List<TransactionRecord> history = accountTransactions.getOrDefault(accountId, List.of());
        int start = page * pageSize;
        int end = Math.min(start + pageSize, history.size());
        if (start >= history.size()) {
            return List.of();
        }
        return history.subList(start, end);
    }

    /**
     * Simulates a fraud check. In production, this would make a gRPC call
     * to the Python fraud detection service.
     */
    private boolean simulateFraudCheck(double amount, String accountId) {
        // Flag transactions over 10000 as potentially fraudulent for demo
        return amount > 10000;
    }

    /**
     * Initialize sample accounts and data for demonstration purposes.
     */
    private void initializeSampleData() {
        // Create sample accounts
        Account checking1 = new Account("user-001", "CHECKING", 5000.00, "USD");
        checking1.setAccountId("acc-001");
        accounts.put("acc-001", checking1);

        Account savings1 = new Account("user-001", "SAVINGS", 25000.00, "USD");
        savings1.setAccountId("acc-002");
        accounts.put("acc-002", savings1);

        Account checking2 = new Account("user-002", "CHECKING", 3000.00, "USD");
        checking2.setAccountId("acc-003");
        accounts.put("acc-003", checking2);

        Account credit1 = new Account("user-002", "CREDIT", 10000.00, "USD");
        credit1.setAccountId("acc-004");
        accounts.put("acc-004", credit1);

        logger.info("Sample data initialized: {} accounts", accounts.size());
    }
}
