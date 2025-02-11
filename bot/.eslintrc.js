module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-console": "off",
    "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
  },
};
