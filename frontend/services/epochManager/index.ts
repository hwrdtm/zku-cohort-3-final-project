import { BigNumber, Contract, ethers, providers, Signer, utils } from "ethers";
import EpochManager from "../../contracts/EpochManager.json";
import {
  CollectRewardParams,
  Epoch,
  NewEpochParams,
  SolidityProof,
  SolidityProofInput,
  SubmitTokenAllocationCommitmentProofParams,
  UpdateTokenAllocationCommitmentParams,
} from "../../models";
import {
  CIRCUIT_TOKEN_ALLOCATION_INPUT_LENGTH,
  MAX_TOKENS_TO_ALLOCATE,
} from "../../constants";
import detectEthereumProvider from "@metamask/detect-provider";
import config, { getContractAddress } from "../../config";
import { iface } from "./common";

import { submitTokenAllocationCommitmentProof as submitTokenAllocationCommitmentProofFunction } from "./submitTokenAllocationCommitmentProof";
import { submitRevealedTokenAllocations as submitRevealedTokenAllocationsFunction } from "./submitRevealedTokenAllocations";
import { collectEpochReward as collectEpochRewardFunction } from "./collectEpochReward";

const buildPoseidon = require("circomlibjs").buildPoseidon;
let poseidon: any;
(async () => {
  poseidon = await buildPoseidon();
})();

export const submitTokenAllocationCommitmentProof =
  submitTokenAllocationCommitmentProofFunction;

export const submitRevealedTokenAllocations =
  submitRevealedTokenAllocationsFunction;

export const collectEpochReward = collectEpochRewardFunction;

export async function fetchEpoch(
  addressOfEpochAdmin: string
): Promise<Epoch | null> {
  const provider = new providers.JsonRpcProvider(config.browserNodeUrl);
  const epochManagerContract = new Contract(
    getContractAddress(),
    EpochManager.abi,
    provider
  );

  try {
    const epoch = await epochManagerContract.adminEpochs(addressOfEpochAdmin);
    const epochMembers = await epochManagerContract.getEpochMembers(
      addressOfEpochAdmin
    );
    const epochTokenAllocationCommitments =
      await epochManagerContract.getEpochTokenAllocationCommitments(
        addressOfEpochAdmin
      );
    const epochTokenAllocationCommitmentsVerified =
      await epochManagerContract.getEpochTokenAllocationCommitmentsVerified(
        addressOfEpochAdmin
      );
    const epochRevealedTokenAllocations =
      await epochManagerContract.getEpochRevealedTokenAllocations(
        addressOfEpochAdmin
      );

    const epochData = {
      ...epoch,
      adminAddress: addressOfEpochAdmin,
      members: epochMembers,
      tokenAllocationCommitments: epochTokenAllocationCommitments,
      tokenAllocationCommitmentsVerified:
        epochTokenAllocationCommitmentsVerified,
      revealedTokenAllocations: epochRevealedTokenAllocations,
    };

    return epochData;
  } catch (error: any) {
    console.error("unable to fetch epoch details", { error });

    return null;
  }
}

function getScheduleNewEpochSolidityData(
  newEpochParams: NewEpochParams
): string {
  return iface.encodeFunctionData("scheduleNewEpoch", [
    newEpochParams.members,
    utils.hexlify(newEpochParams.startsAt),
    utils.hexlify(newEpochParams.duration),
    newEpochParams.dedicatedCoordinator,
  ]);
}

function getUpdateTokenAllocationCommitmentSolidityData(
  params: UpdateTokenAllocationCommitmentParams
): string {
  return iface.encodeFunctionData("updateTokenAllocationCommitment", [
    params.addressOfEpochAdmin,
    utils.hexlify(params.commitmentHash),
  ]);
}

export async function scheduleNewEpoch(newEpochParams: NewEpochParams) {
  console.log("new epoch params", { newEpochParams });

  const provider = (await detectEthereumProvider()) as any;
  const ethersProvider = new providers.Web3Provider(provider);
  const signer = ethersProvider.getSigner();
  const connectedWalletAddress = await signer.getAddress();

  const nonce = await ethersProvider.getTransactionCount(
    signer.getAddress(),
    "latest"
  );

  const tx = {
    from: connectedWalletAddress,
    to: getContractAddress(),
    nonce,
    value: utils.hexlify(
      utils.parseEther(newEpochParams.rewardBudget.toString())
    ),
    data: getScheduleNewEpochSolidityData(newEpochParams),
    gasLimit: utils.hexlify(1000000),
    gasPrice: utils.hexlify(10000000000),
  };

  console.log("sending scheduleNewEpoch TX", { tx });

  try {
    await signer.sendTransaction(tx);
  } catch (error: any) {
    console.error("unable to schedule new epoch", { error });
    throw error;
  }
}

function padTokenAllocations(privateTokenAllocations: number[]) {
  // init array of zeros
  const paddedArr = Array.apply(
    null,
    Array(CIRCUIT_TOKEN_ALLOCATION_INPUT_LENGTH)
  ).map((_) => 0);

  // write with private values
  for (let i = 0; i < privateTokenAllocations.length; i++) {
    paddedArr[i] = privateTokenAllocations[i];
  }

  return paddedArr;
}

export async function updateTokenAllocations(
  addressOfEpochAdmin: string,
  allocatingMemberIdx: number,
  numMembers: number,
  privateTokenAllocations: number[]
) {
  const provider = (await detectEthereumProvider()) as any;
  const ethersProvider = new providers.Web3Provider(provider);
  const signer = ethersProvider.getSigner();
  const connectedWalletAddress = await signer.getAddress();

  // 1. Sign message to prove ownership over wallet
  const signature = await signer.signMessage(config.signaturePayload);

  // 2. Generate salt
  const privSalt = ethers.BigNumber.from(ethers.utils.randomBytes(32));

  // 3. Validate token allocation distribution
  if (
    privateTokenAllocations.reduce((prev, curr) => prev + curr, 0) !==
    MAX_TOKENS_TO_ALLOCATE
  ) {
    return;
  }

  // 4. Hash salt + token allocation.
  // Pad token allocation to array of 15 to work well with circuit.
  const paddedPrivateTokenAllocations = padTokenAllocations(
    privateTokenAllocations
  );
  const tokenAllocationCommitmentHash: BigNumber = ethers.BigNumber.from(
    poseidon.F.toObject(poseidon([privSalt, ...paddedPrivateTokenAllocations]))
  );
  console.log("submitting commitment hash to contract", {
    tokenAllocationCommitmentHash,
  });

  // 5. Commit hash to contract
  const nonce = await ethersProvider.getTransactionCount(
    signer.getAddress(),
    "latest"
  );

  const tx = {
    from: connectedWalletAddress,
    to: getContractAddress(),
    nonce,
    data: getUpdateTokenAllocationCommitmentSolidityData({
      addressOfEpochAdmin,
      commitmentHash: tokenAllocationCommitmentHash,
    }),
    gasLimit: utils.hexlify(1000000),
    gasPrice: utils.hexlify(10000000000),
  };

  console.log("sending updateTokenAllocationCommitment TX", { tx });

  try {
    const userCommitmentTxResponse = await signer.sendTransaction(tx);
    console.log("tx submitted", { userCommitmentTxResponse });

    // wait until tx is confirmed
    if (config.environment !== "local") {
      console.log("waiting until tx is confirmed");
      const userCommitmentTxReceipt = await userCommitmentTxResponse.wait(
        config.userCommitmentBlockConfirmations
      );
      console.log("tx confirmed", { userCommitmentTxReceipt });
    }
  } catch (error: any) {
    console.error("unable to update token allocation commitment", { error });
  }

  // 6. POST to API for verification with proof - (salt, tokenAllocations, addressOfEpochAdmin, signature)
  const response = await fetch("/api/token-allocations", {
    method: "POST",
    body: JSON.stringify({
      privSalt: privSalt.toString(),
      privTokenAllocations: paddedPrivateTokenAllocations,
      addressOfEpochAdmin,
      allocatingMemberIdx,
      numMembers,
      signature,
    }),
  });
}
