module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$'
    }
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@environments/(.*)$': '<rootDir>/src/environments/$1',
    '^workbox-(.*)$': '<rootDir>/node_modules/workbox-$1/build/workbox-$1.prod.js',
    '\\.(html|scss)$': '<rootDir>/src/test-config/mock-module.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!@angular|@ngrx|workbox-*|angular-oauth2-oidc)'
  ],
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '.html',
    '.module.ts'
  ]
}; 