const { getDatabase, initializeDatabase, closeDatabase } = require('../../database/init');

describe('Database Initialization – Digital Library', () => {
  test('should return a database instance', () => {
    const db = getDatabase();
    expect(db).toBeDefined();
    expect(db).not.toBeNull();
  });

  test('should return the same database instance on subsequent calls', () => {
    const db1 = getDatabase();
    const db2 = getDatabase();
    expect(db1).toBe(db2);
  });

  test('should initialize the database without errors', async () => {
    await expect(initializeDatabase()).resolves.toBeUndefined();
  });

  test('should close the database without errors', async () => {
    await expect(closeDatabase()).resolves.toBeUndefined();
  });

  test('should handle multiple close calls gracefully', async () => {
    await closeDatabase();
    // Second close should resolve without error
    await expect(closeDatabase()).resolves.toBeUndefined();
  });
});
