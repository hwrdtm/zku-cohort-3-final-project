import detectEthereumProvider from "@metamask/detect-provider";
import { getContractAddress } from "config";
import { providers, utils } from "ethers";
import { CollectRewardParams } from "../../models";
import { iface } from "./common";

function getCollectEpochRewardSolidityData(
  params: CollectRewardParams
): string {
  return iface.encodeFunctionData("collectEpochReward", [
    params.addressOfEpochAdmin,
  ]);
}

export async function collectEpochReward(params: CollectRewardParams) {
  console.log("collecting epoch reward", { params });

  const provider = (await detectEthereumProvider()) as any;
  const ethersProvider = new providers.Web3Provider(provider);
  const signer = ethersProvider.getSigner();
  const connectedWalletAddress = await signer.getAddress();

  const nonce = await ethersProvider.getTransactionCount(
    connectedWalletAddress,
    "latest"
  );

  const tx = {
    from: connectedWalletAddress,
    to: getContractAddress(),
    nonce,
    data: getCollectEpochRewardSolidityData(params),
    gasLimit: utils.hexlify(1000000),
    gasPrice: utils.hexlify(10000000000),
  };

  console.log("sending collectEpochReward TX", { tx });

  try {
    await signer.sendTransaction(tx);
  } catch (error: any) {
    console.error("unable to collect epoch reward", { error });
    throw error;
  }
}
