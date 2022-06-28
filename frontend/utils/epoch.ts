import { BigNumber } from "ethers";
import { Epoch, EpochState } from "../models";

function getBNNow(): BigNumber {
  return BigNumber.from(Math.floor(new Date().valueOf() / 1000));
}

export function isEpochActive(epoch: Epoch): boolean {
  const now = getBNNow();

  if (epoch.startsAt.lte(now)) {
    return epoch.startsAt.add(epoch.epochDuration).gte(now);
  }

  return false;
}

export function isEpochFinished(epoch: Epoch): boolean {
  const now = getBNNow();
  return !isEpochActive(epoch) && epoch.startsAt.lte(now);
}

export function getEpochState(epoch: Epoch): EpochState {
  if (isEpochFinalized(epoch)) {
    return EpochState.Finalized;
  } else if (isEpochFinished(epoch)) {
    return EpochState.Finished;
  } else if (isEpochActive(epoch)) {
    return EpochState.Active;
  }
  return EpochState.Scheduled;
}

// An epoch is considered finalized as soon as any element of the
// revealed token allocations is non-zero.
export function isEpochFinalized(epoch: Epoch): boolean {
  for (let i = 0; i < epoch.revealedTokenAllocations.length; i++) {
    if (!epoch.revealedTokenAllocations[i].eq(BigNumber.from(0))) {
      return true;
    }
  }
  return false;
}

export function isAddressAdminOfEpoch(address: string, epoch: Epoch): boolean {
  return address === epoch.adminAddress;
}

export function isAddressMemberOfEpoch(address: string, epoch: Epoch): boolean {
  return epoch.members.indexOf(address) > -1;
}

export function isAllTokenAllocationCommitmentsVerified(epoch: Epoch): boolean {
  for (let i = 0; i < epoch.tokenAllocationCommitmentsVerified.length; i++) {
    if (!epoch.tokenAllocationCommitmentsVerified[i]) {
      return false;
    }
  }

  return true;
}
