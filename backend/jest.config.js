module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude server startup file
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 60,
      statements: 60
    }
  },
  // Allow Jest to transform ESM packages (jwks-rsa and its dependency jose use ESM)
  transformIgnorePatterns: [
    '/node_modules/(?!(jwks-rsa|jose)/)'
  ],
  verbose: true,
  testTimeout: 10000
};
