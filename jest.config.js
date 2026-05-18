export default {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/tests/integration/**/*.test.js"],
};
