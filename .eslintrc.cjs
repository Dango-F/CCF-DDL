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
    // 支持解析 .vue 单文件组件（SFC）
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
    // 禁止源码中直接使用 console；建议使用 logger
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.name='console']",
        message: 'Do not use console.* in src. Use logger.* instead.'
      }
    ],
    'no-debugger': 'error',
    // 放宽在 uni-app 项目中，针对 SFC 的一些严格格式化规则
    'vue/attributes-order': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/html-closing-bracket-newline': 'off',
    'vue/html-closing-bracket-spacing': 'off',
    'vue/multi-word-component-names': 'off',
    // 可选：如需可以收紧其它规则
  },
  overrides: [
    {
      files: ['scripts/**', 'scripts/*'],
      rules: {
        // 允许在构建或工具脚本中使用 console
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
        // logger.ts 是唯一允许直接调用 console 的源文件
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
