import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Accept the leading-underscore convention for intentionally unused
  // parameters (e.g. mock implementations that match a signature but ignore
  // their arguments).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // TanStack Table's `useReactTable()` is hardcoded in
  // eslint-plugin-react-hooks as `knownIncompatible` — it returns functions
  // that cannot be memoized, so React Compiler skips memoizing any component
  // that calls it. There is no code-level fix; the rule flags a genuine,
  // unresolvable library limitation. Suppress only in the stats-table files
  // that legitimately use it.
  {
    files: ["src/components/game/*-stats-table.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
