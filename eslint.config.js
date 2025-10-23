import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        global: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        FileReader: 'readonly',
        location: 'readonly',
        URL: 'readonly',
        API_BASE: 'readonly',
        showLoading: 'readonly',
        hideLoading: 'readonly',
        showImageResult: 'readonly',
        trackTask: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'out/', 'coverage/', 'node_modules/', 'archive/'],
  },
]
