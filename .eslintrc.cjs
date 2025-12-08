module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: ['./tsconfig.eslint.json'],
    createDefaultProgram: true,
    tsconfigRootDir: __dirname,
    // Support parsing .vue SFCs
    extraFileExtensions: ['.vue'],
    parser: '@typescript-eslint/parser',
  },
  globals: {
    uni: 'readonly',
    plus: 'readonly',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-essential',
  ],
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    // Disallow direct use of console in source; encourage use of logger
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.name='console']",
        message: 'Do not use console.* in src. Use logger.* instead.'
      }
    ],
    'no-debugger': 'error',
    // Relax some formatting rules that are strict for SFCs in uni-app projects
    'vue/attributes-order': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/html-closing-bracket-newline': 'off',
    'vue/html-closing-bracket-spacing': 'off',
    'vue/multi-word-component-names': 'off',
    // Optional: tighten other rules as desired
  },
  overrides: [
    {
      files: ['scripts/**', 'scripts/*'],
      rules: {
        // allow console in build / utility scripts
        'no-restricted-syntax': 'off'
      }
    },
    {
      files: ['src/pages/**/*.vue', 'src/components/**/*.vue'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      }
    },
    {
      files: ['src/utils/logger.ts'],
      rules: {
        // logger.ts is the only source that should call console directly
        'no-restricted-syntax': 'off'
      }
    },
    {
      files: ['src/**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    }
  ]
};
