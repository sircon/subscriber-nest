module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/database(.*)$': '<rootDir>/libs/database/src$1',
    '^@app/core(.*)$': '<rootDir>/libs/core/src$1',
  },
  roots: ['<rootDir>/libs/', '<rootDir>/apps/'],
  // Ignore compiled JS files in the esp directory
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/libs/core/src/esp/*.js'],
};
