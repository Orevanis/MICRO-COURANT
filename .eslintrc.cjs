module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    "*.config.js",
    "postcss.config.js",
    "tailwind.config.js",
  ],
  overrides: [
    {
      files: [
        "**/*.test.js",
        "**/*.test.jsx",
        "**/*.spec.js",
        "**/tests/**/*.js",
      ],
      env: { jest: true },
    },
  ],
};
