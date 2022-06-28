import { providers, Signer, utils } from "ethers";
import config, { getContractAddress } from "../../config";
import { SubmitRevealedTokenAllocationsParams } from "../../models";
import { iface } from "./common";

function getSubmitRevealedTokenAllocations(
  params: SubmitRevealedTokenAllocationsParams
) {
  return iface.encodeFunctionData("submitRevealedTokenAllocations", [
    params.addressOfEpochAdmin,
    params.finalTokenAllocations.map((tokens) => utils.hexlify(tokens)),
  ]);
}

export async function submitRevealedTokenAllocations(
  dedicatedCoordinatorSigner: Signer,
  addressOfEpochAdmin: string,
  finalTokenAllocations: number[]
) {
  const provider = new providers.JsonRpcProvider(config.nodeUrl);
  const signerAddress = await dedicatedCoordinatorSigner.getAddress();
  const nonce = await provider.getTransactionCount(signerAddress, "latest");

  const tx = {
    from: signerAddress,
    to: getContractAddress(),
    nonce,
    data: getSubmitRevealedTokenAllocations({
      addressOfEpochAdmin,
      finalTokenAllocations,
    }),
    gasLimit: utils.hexlify(1000000),
    gasPrice: utils.hexlify(10000000000),
  };

  console.log("sending submitRevealedTokenAllocations TX", { tx });

  try {
    const txResp = await dedicatedCoordinatorSigner.sendTransaction(tx);
    console.log("txResp", { txResp });
  } catch (error: any) {
    console.error("unable to submit revealed token allocations", {
      error,
    });
    throw error;
  }
}
