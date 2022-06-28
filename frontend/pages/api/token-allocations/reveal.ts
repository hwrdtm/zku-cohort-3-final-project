import config from "config";
import { ethers, providers } from "ethers";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchEpoch,
  submitRevealedTokenAllocations,
} from "services/epochManager";
import { calculateRevealedTokenAllocations } from "services/tokenAllocations";
import {
  isAllTokenAllocationCommitmentsVerified,
  isEpochFinished,
} from "utils/epoch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { addressOfEpochAdmin } = JSON.parse(req.body);

  // First fetch epoch.
  const epochToReveal = await fetchEpoch(addressOfEpochAdmin);
  if (!epochToReveal) {
    return res.status(404).end();
  }

  // Check whether epoch is finished.
  if (!isEpochFinished(epochToReveal)) {
    return res.status(400).json({
      error: "Epoch must be finished before revealing token allocations.",
    });
  }

  // Check whether epoch has all token allocation commitments as verified.
  if (!isAllTokenAllocationCommitmentsVerified(epochToReveal)) {
    return res.status(400).json({
      error:
        "Epoch must have all token allocation commitments be verified before revealing token allocations.",
    });
  }

  // Calculate final token allocations.
  const revealedTokenAllocations = await calculateRevealedTokenAllocations(
    addressOfEpochAdmin
  );
  console.log("calculated revealed token allocations", {
    revealedTokenAllocations,
  });

  // Slice token allocations to match number of actual members on-chain.
  const actualRevealedTokenAllocations = revealedTokenAllocations.slice(
    0,
    epochToReveal.members.length
  );

  // Finally, submit revealed token allocations to contract.
  try {
    const dedicatedCoordinatorSigner = new ethers.Wallet(
      config.dedicatedCoordinatorPrivateKey,
      new providers.JsonRpcProvider(config.nodeUrl)
    );

    console.log("submitting revealed token allocations", {
      addressOfEpochAdmin,
      revealedTokenAllocations,
      actualRevealedTokenAllocations,
    });

    await submitRevealedTokenAllocations(
      dedicatedCoordinatorSigner,
      addressOfEpochAdmin,
      actualRevealedTokenAllocations
    );
  } catch (error: any) {
    console.error("unable to submit revealed token allocations", { error });
    return res.status(500).end();
  }

  return res.status(200).end();
}
