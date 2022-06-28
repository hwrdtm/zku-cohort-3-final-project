import { utils } from "ethers";
import EpochManager from "../../contracts/EpochManager.json";

export const iface = new utils.Interface(EpochManager.abi);
