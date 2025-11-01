// ESLint flat config for Podr project
// This uses ESLint 9.x flat config format

const path = require('path');
const typescriptParser = require('@typescript-eslint/parser');

// Import the custom rule
const noJsxLiterals = require('./eslint-rules/no-jsx-literals.js');

module.exports = [
  {
    // Global ignores
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/lib-commonjs/**',
      '**/temp/**',
      '**/*.d.ts',
      '**/coverage/**',
      '**/.heft/**',
      '**/webpack.config.js',
      '**/jest.config.js',
      '**/postcss.config.js'
    ]
  },
  {
    // Configuration for TypeScript and JavaScript files
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLAudioElement: 'readonly',
        
        // Node.js globals
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    },
    
    plugins: {
      'podr': {
        rules: {
          'no-jsx-literals': noJsxLiterals
        }
      }
    },
    
    rules: {
      // Enable our custom rule to prevent re-render issues
      'podr/no-jsx-literals': ['error', {
        allowEmptyArray: false,
        allowEmptyObject: false,
        checkInlineFunctions: true,
        checkHookDependencies: true
      }],
      
      // Basic code quality rules
      'no-console': 'off', // We use console for logging
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }]
    }
  },
  {
    // Special configuration for test files
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    
    rules: {
      // Relax the rule for test files since they often use literals intentionally
      'podr/no-jsx-literals': ['warn', {
        allowEmptyArray: true,
        allowEmptyObject: true,
        checkInlineFunctions: false,
        checkHookDependencies: true
      }]
    }
  }
];
