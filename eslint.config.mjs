import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    ignores: ["node_modules/", ".next/", "out/", "prisma/", "scripts/"],
  },
  {
    rules: {
      // The setMounted(true) pattern in useEffect is intentional and widespread
      "react-hooks/set-state-in-effect": "warn",
      // React Hook Form's watch() triggers this incorrectly
      "react-hooks/incompatible-library": "warn",
      // Unescaped entities in JSX text are cosmetic, not bugs
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default config;
