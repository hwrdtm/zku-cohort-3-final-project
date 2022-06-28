import React from "react";
import { Container } from "@mui/material";
import { Epoch } from "../../models";
import {
  getEpochState,
  isAddressAdminOfEpoch,
  isAddressMemberOfEpoch,
} from "../../utils/epoch";
import TokenAllocationInput from "../TokenAllocationInput";

export default function EpochDetails({
  epoch,
  connectedWalletAddress,
}: {
  epoch: Epoch;
  connectedWalletAddress?: string;
}) {
  const startsAtDate = new Date(parseInt(epoch.startsAt.toString()) * 1000);
  const durationSeconds = parseInt(epoch.epochDuration.toString());
  const endsAtDate = new Date(
    (parseInt(epoch.startsAt.toString()) + durationSeconds) * 1000
  );

  const isAddressMember = connectedWalletAddress
    ? isAddressMemberOfEpoch(connectedWalletAddress, epoch)
    : false;
  const isAddressAdmin = connectedWalletAddress
    ? isAddressAdminOfEpoch(connectedWalletAddress, epoch)
    : false;

  return (
    <Container style={{ border: "1px solid grey", borderRadius: "10px" }}>
      <Container>
        <h3>Epoch Details</h3>
        <h5>
          Admin Address: {epoch.adminAddress}{" "}
          {!!connectedWalletAddress && isAddressAdmin ? "(you)" : ""}
        </h5>
        <h5>Epoch State: {getEpochState(epoch)}</h5>
        <h5>Reward Budget: {epoch.rewardBudget.toString()}</h5>
        <h5>Members: {epoch.members.join(", ")}</h5>
        <h5>
          Token Allocation Commitments:{" "}
          {epoch.tokenAllocationCommitments.join(", ")}
        </h5>
        <h5>
          Token Allocation Commitments Verified:{" "}
          {epoch.tokenAllocationCommitmentsVerified.join(", ")}
        </h5>
        <h5>Starts At: {startsAtDate.toISOString()}</h5>
        <h5>Epoch Duration: {epoch.epochDuration.toString()} seconds</h5>
        <h5>Ends At: {endsAtDate.toISOString()}</h5>
        <h5>Dedicated Coordinator: {epoch.dedicatedCoordinator}</h5>
        <h5>
          Revealed Token Allocations:{" "}
          {epoch.revealedTokenAllocations.map((bn) => bn.toString()).join(", ")}
        </h5>
      </Container>
      {isAddressMember && (
        <Container>
          <hr />
          <h3>Member Actions</h3>
          <h4>Update Private Token Allocations</h4>
          <TokenAllocationInput
            epoch={epoch}
            connectedWalletAddress={connectedWalletAddress}
          />
        </Container>
      )}
    </Container>
  );
}
