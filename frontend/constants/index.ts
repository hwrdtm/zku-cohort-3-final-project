import config from "config";

export const MAX_TOKENS_TO_ALLOCATE = 10000;
export const CIRCUIT_TOKEN_ALLOCATION_INPUT_LENGTH = 15;

export const getBlockchainCurrency = () => {
  const configEnvKey =
    typeof window === "undefined" ? "environment" : "browserEnvironment";
  if (config[configEnvKey] === "local") {
    return "ETH";
  } else if (config[configEnvKey] === "staging") {
    return "ETH";
  }
  return "ONE";
};
