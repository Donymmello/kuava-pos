module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // O tsconfig já força noUnusedLocals/noUnusedParameters — esta regra
    // apanha o mesmo em ficheiros que o tsc não cobre (ex. fora de src/) e
    // permite prefixar com `_` para parâmetros intencionalmente não usados
    // (ex. `(_req, res) => ...` nos handlers Express).
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
};
