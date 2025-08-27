module.exports = {
    env: {
      node: true,
      es2021: true,
      jest: true,
    },
    extends: ['airbnb-base', 'prettier'],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': 'warn',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    },
  };