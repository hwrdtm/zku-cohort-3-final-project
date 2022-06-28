import contractAddress from "../contracts/contract-address.json";

const config = {
  nodeUrl: process.env.NODE_URL || "http://localhost:8545",
  browserNodeUrl: process.env.NEXT_PUBLIC_NODE_URL || "http://localhost:8545",
  signaturePayload:
    process.env.SIGNATURE_PAYLOAD ||
    "I am committing my private token allocation",
  dedicatedCoordinatorPrivateKey:
    process.env.DEDICATED_COORDINATOR_PRIVATE_KEY || "dummy-key",
  userCommitmentBlockConfirmations: parseInt(
    process.env.USER_COMMITMENT_BLOCK_CONFIRMATIONS || "8"
  ),
  environment: process.env.ENVIRONMENT || "local",
  browserEnvironment: process.env.NEXT_PUBLIC_ENVIRONMENT || "local",
  redisUrl: process.env.REDIS_URL || "http://localhost:6379",
};

export const getContractAddress = () => {
  if (typeof window === "undefined") {
    // server-side
    if (config.environment === "local") {
      return contractAddress.local.EpochManager;
    } else if (config.environment === "staging") {
      return contractAddress.rinkeby.EpochManager;
    }
    return contractAddress.harmonyDevnet.EpochManager;
  } else {
    // browser-side
    if (config.browserEnvironment === "local") {
      return contractAddress.local.EpochManager;
    } else if (config.browserEnvironment === "staging") {
      return contractAddress.rinkeby.EpochManager;
    }
    return contractAddress.harmonyDevnet.EpochManager;
  }
};

export default config;
