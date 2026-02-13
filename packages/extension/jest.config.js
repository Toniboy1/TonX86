module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/__mocks__/**'
  ],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts'
  },
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 96,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
