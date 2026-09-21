const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "warn",
      "no-var": "warn",
    },
  },
];