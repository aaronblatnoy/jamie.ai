/* ESLint config — deliberately scoped to catch runtime CRASHES, not style.
 *
 * Why this exists: `vite build` only checks syntax, so bugs that compile
 * cleanly but crash at runtime ship undetected. The one that bit us:
 * a `const` (useCallback) referenced in another hook's dependency array
 * BEFORE its definition line → temporal-dead-zone ReferenceError on every
 * render → ErrorBoundary "Something went wrong."
 *
 * We intentionally do NOT extend eslint:recommended / react-hooks
 * "recommended" wholesale — they flag many pre-existing, working patterns
 * (empty catch blocks, setState-in-effect) that are not crashes and would
 * drown the signal. Add rules here only when they catch real breakage. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  plugins: ['react', 'react-hooks'],
  rules: {
    // THE bug that shipped: const/class used before its definition (TDZ).
    'no-use-before-define': ['error', { functions: false, variables: true, classes: true }],
    // Undefined references — typos, missing imports.
    'no-undef': 'error',
    // JSX referencing an undefined component.
    'react/jsx-no-undef': 'error',
    // Hooks called conditionally / out of order → runtime breakage.
    'react-hooks/rules-of-hooks': 'error',
    // Stale-closure / missing-dep bugs — warn (don't block) since the
    // codebase has intentional eslint-disable lines already.
    'react-hooks/exhaustive-deps': 'warn',
  },
};
