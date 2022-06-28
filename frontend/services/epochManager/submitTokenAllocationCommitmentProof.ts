import { providers, Signer, utils } from "ethers";
import config, { getContractAddress } from "../../config";
import {
  SolidityProofInput,
  SubmitTokenAllocationCommitmentProofParams,
} from "../../models";
import { iface } from "./common";

function getSubmitTokenAllocationCommitmentProofSolidityData(
  params: SubmitTokenAllocationCommitmentProofParams
): string {
  return iface.encodeFunctionData("submitTokenAllocationCommitmentProof", [
    params.addressOfEpochAdmin,
    params.addressOfEpochMember,
    params.solidityProofInput[0],
    params.solidityProofInput[1],
    params.solidityProofInput[2],
    params.solidityProofInput[3],
  ]);
}

export async function submitTokenAllocationCommitmentProof(
  dedicatedCoordinatorSigner: Signer,
  addressOfEpochAdmin: string,
  addressOfEpochMember: string,
  solidityProofInput: SolidityProofInput
) {
  const provider = new providers.JsonRpcProvider(config.nodeUrl);
  const signerAddress = await dedicatedCoordinatorSigner.getAddress();
  const nonce = await provider.getTransactionCount(signerAddress, "latest");

  const tx = {
    from: signerAddress,
    to: getContractAddress(),
    nonce,
    data: getSubmitTokenAllocationCommitmentProofSolidityData({
      addressOfEpochAdmin,
      addressOfEpochMember,
      solidityProofInput,
    }),
    gasLimit: utils.hexlify(1000000),
    gasPrice: utils.hexlify(10000000000),
  };

  console.log("sending submitTokenAllocationCommitmentProof TX", { tx });

  try {
    const txResp = await dedicatedCoordinatorSigner.sendTransaction(tx);
    console.log("txResp", { txResp });
  } catch (error: any) {
    console.error("unable to submit token allocation commitment proof", {
      error,
    });
    throw error;
  }
}
