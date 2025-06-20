// .eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  // Global extensions for all files
  extends: ['eslint:recommended', 'prettier'],
  // The 'overrides' section is the key to this configuration.
  // It allows applying specific configurations for specific file types.
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: [
          './product-service/tsconfig.json',
          './notification-service/tsconfig.json',
          './search-indexer-service/tsconfig.json',
        ],
      },
      plugins: ['@typescript-eslint', 'import'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
            'newlines-between': 'always',
            alphabetize: { order: 'asc', caseInsensitive: true },
          },
        ],
        'import/extensions': ['error', 'ignorePackages', { ts: 'never', tsx: 'never' }],
      },
      settings: {
        'import/resolver': {
          typescript: {
            project: [
              './product-service/tsconfig.json',
              './notification-service/tsconfig.json',
              './search-indexer-service/tsconfig.json',
            ],
          },
        },
      },
    },
  ],
};
