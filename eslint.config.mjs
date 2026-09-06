import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts", "LNSITE/**"] },
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
