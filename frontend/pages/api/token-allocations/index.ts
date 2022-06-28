import config from "config";
import { BigNumber, ethers, providers } from "ethers";
import type { NextApiRequest, NextApiResponse } from "next";
import { CIRCUIT_TOKEN_ALLOCATION_INPUT_LENGTH } from "../../../constants";
import { SolidityProofInput, SubmitTokenAllocations } from "models";
import { generateProof } from "../../../services/proof";
import { submitTokenAllocationCommitmentProof } from "services/epochManager";
import { persistPrivateTokenAllocations } from "services/tokenAllocations";

const buildPoseidon = require("circomlibjs").buildPoseidon;

function validateRequest(privTokenAllocations: number[]): boolean {
  return privTokenAllocations.length === CIRCUIT_TOKEN_ALLOCATION_INPUT_LENGTH;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    privSalt,
    privTokenAllocations,
    allocatingMemberIdx,
    addressOfEpochAdmin,
    numMembers,
    signature,
  }: SubmitTokenAllocations = JSON.parse(req.body);

  // Validation
  if (!validateRequest(privTokenAllocations)) {
    return res.status(500).send("Token allocations must be an array of 15.");
  }

  const dedicatedCoordinatorSigner = new ethers.Wallet(
    config.dedicatedCoordinatorPrivateKey,
    new providers.JsonRpcProvider(config.nodeUrl)
  );

  // Recover wallet address that signed signature
  const recoveredWalletAddress = ethers.utils.verifyMessage(
    config.signaturePayload,
    signature
  );
  console.log("recovered wallet address", { recoveredWalletAddress });

  // Write private token allocations to (persistent / temporary) storage
  // to be used at later stage during reveal.
  persistPrivateTokenAllocations(
    addressOfEpochAdmin,
    recoveredWalletAddress,
    privTokenAllocations
  );

  // Hash private variables to get hash
  let tokenAllocationCommitmentHash: BigNumber;
  try {
    let poseidon = await buildPoseidon();
    tokenAllocationCommitmentHash = ethers.BigNumber.from(
      poseidon.F.toObject(poseidon([privSalt, ...privTokenAllocations]))
    );
  } catch (error: any) {
    console.error("unable to generate commitment hash", { error });
    return res.status(500).end();
  }

  // Generate proof
  let solidityProofInput: SolidityProofInput;
  try {
    solidityProofInput = await generateProof({
      pubTokenAllocationHash: tokenAllocationCommitmentHash.toBigInt(),
      allocatingMemberIdx,
      numMembers,
      tokenAllocations: privTokenAllocations,
      salt: BigNumber.from(privSalt).toBigInt(),
    });
  } catch (error: any) {
    console.error("unable to generate proof", { error });
    return res.status(500).end();
  }

  // Submit proof to contract
  try {
    console.log("submitting token allocation commitment proof", {
      solidityProofInput,
    });
    await submitTokenAllocationCommitmentProof(
      dedicatedCoordinatorSigner,
      addressOfEpochAdmin,
      recoveredWalletAddress,
      solidityProofInput
    );
  } catch (error: any) {
    console.error("unable to submit proof", { error });
    return res.status(500).end();
  }

  return res.status(200).end();
}
