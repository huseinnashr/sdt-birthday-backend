const { defaults: tsjPreset } = require('ts-jest/presets')

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '\\.[jt]sx?$': 'ts-jest'
  },
  globals: {
      'ts-jest': {
          useESM: true
      }
  },
  moduleNameMapper: {
      '(.+)\\.js': '$1'
  },
  extensionsToTreatAsEsm: ['.ts']
};