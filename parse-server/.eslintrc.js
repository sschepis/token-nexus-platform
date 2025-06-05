module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:jest/recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Error prevention
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-duplicate-imports': 'error',
    'no-var': 'error',
    'prefer-const': 'error',

    // Best practices
    'require-await': 'error',
    'no-return-await': 'error',
    'no-async-promise-executor': 'error',
    'no-promise-executor-return': 'error',
    'max-nested-callbacks': ['error', 3],
    'max-depth': ['error', 4],

    // Code style
    'arrow-body-style': ['error', 'as-needed'],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
    ],

    // Documentation
    'valid-jsdoc': [
      'warn',
      {
        requireReturn: false,
        requireReturnType: true,
        requireParamType: true,
        prefer: {
          returns: 'return',
        },
      },
    ],

    // Jest specific rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/valid-expect': 'error',
    'jest/no-standalone-expect': 'error',

    // Service-specific rules
    'no-underscore-dangle': [
      'error',
      {
        allow: [
          '_initializeService',
          '_validateInitialization',
          '_handleError',
          '_cleanupResources',
          '_setupShutdownHandler',
        ],
      },
    ],
  },
  overrides: [
    {
      // Test files
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
        'max-nested-callbacks': 'off',
      },
    },
    {
      // Configuration files
      files: ['*.config.js', 'config/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  settings: {
    jest: {
      version: 27,
    },
  },
};
