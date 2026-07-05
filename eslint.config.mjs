import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "hardhat/artifacts/**",
      "hardhat/cache/**",
      "hardhat/typechain-types/**",
    ],
  },
  {
    rules: {
      // Common mount-time session/status fetch patterns; too strict for this app.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
