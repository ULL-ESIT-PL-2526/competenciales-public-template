module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  verbose: false,
  collectCoverageFrom: [
    'bin/**/*.cjs',
    'src/**/*.cjs',
    'src/parser.cjs'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
