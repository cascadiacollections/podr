module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/?(*.)+(spec|test).(ts|tsx|js|jsx)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Performance optimizations
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Coverage configuration
  collectCoverage: process.env.CI === 'true' || process.env.COVERAGE === 'true',
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 25,
      lines: 30,
      statements: 30
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!**/node_modules/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/lib/'
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': ['babel-jest', { configFile: './.babelrc' }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(preact|@preact|@testing-library)/)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: [
    '<rootDir>/config/jest.setup.js',
    '<rootDir>/src/ui/__tests__/setup.ts'
  ]
};
