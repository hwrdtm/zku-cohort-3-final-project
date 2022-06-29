import { BigNumber } from "ethers";

export interface Epoch {
  adminAddress: string;

  // on-chain properties
  rewardBudget: BigNumber;
  members: string[];
  tokenAllocationCommitments: any[];
  tokenAllocationCommitmentsVerified: boolean[];
  startsAt: BigNumber;
  epochDuration: BigNumber;
  dedicatedCoordinator: string;
  revealedTokenAllocations: BigNumber[];
}

export enum EpochState {
  Scheduled = "Scheduled",
  Active = "Active",
  Finished = "Finished",
  Finalized = "Finalized",
}

export const getAllEpochState = () => {
  return Object.keys(EpochState).filter((item) => {
    return isNaN(Number(item));
  });
};

export interface CollectRewardParams {
  addressOfEpochAdmin: string;
}

export interface NewEpochParams {
  rewardBudget: number;
  members: string[];
  startsAt: number;
  duration: number;
  dedicatedCoordinator: string;
}

export interface UpdateTokenAllocationCommitmentParams {
  addressOfEpochAdmin: string;
  commitmentHash: BigNumber;
}

export interface SubmitTokenAllocationCommitmentProofParams {
  addressOfEpochAdmin: string;
  addressOfEpochMember: string;
  solidityProofInput: SolidityProofInput;
}

export interface SubmitRevealedTokenAllocationsParams {
  addressOfEpochAdmin: string;
  finalTokenAllocations: number[];
}

export interface ProofInput {
  pubTokenAllocationHash: BigInt;
  allocatingMemberIdx: number;
  numMembers: number;
  tokenAllocations: number[];
  salt: BigInt;
}

export interface SolidityProof {
  a: [BigNumber, BigNumber];
  b: [[BigNumber, BigNumber], [BigNumber, BigNumber]];
  c: [BigNumber, BigNumber];
  input: [BigNumber, BigNumber, BigNumber, BigNumber];
}

export type SolidityProofInput = [
  [BigNumber, BigNumber],
  [[BigNumber, BigNumber], [BigNumber, BigNumber]],
  [BigNumber, BigNumber],
  [BigNumber, BigNumber, BigNumber, BigNumber]
];

export interface SubmitTokenAllocations {
  privSalt: string;
  privTokenAllocations: number[];
  allocatingMemberIdx: number;
  addressOfEpochAdmin: string;
  numMembers: number;
  signature: string;
}

// Keyed by addressOfEpochAdmin
export interface AllEpochsPrivateTokenAllocations {
  [key: string]: SingleEpochPrivateTokenAllocations;
}

// Keyed by addressOfEpochMember
export interface SingleEpochPrivateTokenAllocations {
  [key: string]: number[];
}
