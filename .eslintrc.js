module.exports = {
  extends: [
    'next/core-web-vitals'
  ],
  plugins: ['import'],
  rules: {

    // Import ordering
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before'
          },
          {
            pattern: 'next/**',
            group: 'external',
            position: 'before'
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],

    // Enforce absolute imports for cross-directory access
    'import/no-relative-packages': 'error',
    

    // React specific rules
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    'react-hooks/exhaustive-deps': 'warn',

    // General code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',

    // Enforce consistent function declarations
    'func-style': ['error', 'expression', { allowArrowFunctions: true }],

    // Enforce consistent object/array formatting
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],

    // Enforce semicolons
    'semi': ['error', 'always'],

    // Enforce consistent quotes
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

    // Enforce trailing commas
    'comma-dangle': ['error', 'always-multiline']
  },
  overrides: [
    // Specific rules for React components
    {
      files: ['src/components/**/*.tsx', 'src/pages/**/*.tsx'],
      rules: {
        // Enforce default exports for React components
        'import/prefer-default-export': 'error',
        'import/no-default-export': 'off'
      }
    },
    // Specific rules for utility files
    {
      files: ['src/lib/**/*.ts', 'src/utils/**/*.ts', 'src/services/**/*.ts'],
      rules: {
        // Prefer named exports for utilities
        'import/prefer-default-export': 'off',
        'import/no-default-export': 'error'
      }
    },
    // Specific rules for type definition files
    {
      files: ['src/types/**/*.ts', '**/*.d.ts'],
      rules: {
        // Allow any in type definitions
      }
    },
    // Specific rules for API routes
    {
      files: ['src/pages/api/**/*.ts'],
      rules: {
        // Allow default exports for API routes
        'import/no-default-export': 'off'
      }
    }
  ]
};