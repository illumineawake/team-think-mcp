module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/dev.ts',
    '!src/index.ts',
  ],
  moduleNameMapper: {
    // Point to the TypeScript source of the shared package to avoid a pre-build step
    '^@team-think-mcp/shared$': '<rootDir>/../shared/src/index.ts'
  },
  testTimeout: 10000
};