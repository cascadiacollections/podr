// ESLint flat config for Podr project
// This uses ESLint 9.x flat config format

const path = require('path');
const typescriptParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactPerfPlugin = require('eslint-plugin-react-perf');

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
      'react': reactPlugin,
      'react-perf': reactPerfPlugin
    },
    
    rules: {
      // Prevent inline arrow functions and binds in JSX props (causes re-renders)
      'react/jsx-no-bind': ['error', {
        allowArrowFunctions: false,
        allowBind: false,
        allowFunctions: false,
        ignoreRefs: true,
        ignoreDOMComponents: false
      }],
      
      // Prevent JSX props from being set to new object/array literals
      'react-perf/jsx-no-new-object-as-prop': 'error',
      'react-perf/jsx-no-new-array-as-prop': 'error',
      'react-perf/jsx-no-new-function-as-prop': 'error',
      
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
      // Relax rules for test files since they often use literals intentionally
      'react/jsx-no-bind': 'off',
      'react-perf/jsx-no-new-object-as-prop': 'warn',
      'react-perf/jsx-no-new-array-as-prop': 'warn',
      'react-perf/jsx-no-new-function-as-prop': 'off'
    }
  }
];
