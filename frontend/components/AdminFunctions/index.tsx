import { Button, Container, TextField } from "@mui/material";
import React, { useState } from "react";
import { Epoch } from "../../models";
import EpochDetails from "../EpochDetails";
import {
  fetchEpoch,
  scheduleNewEpoch,
  collectEpochReward,
} from "../../services/epochManager";

function RevealEpochFunction() {
  const [epochAdminAddressToReveal, setEpochAdminAddressToReveal] =
    useState("");

  return (
    <Container>
      <h3>Reveal A Finished Epoch</h3>
      <Container>
        <TextField
          label="Epoch Admin Address"
          variant="outlined"
          placeholder="eg. 0x1"
          onChange={(e) => setEpochAdminAddressToReveal(e.target.value)}
        />
      </Container>
      <Button
        onClick={async () => {
          // POST to API to have dedicated coordinator reveal token allocations
          await fetch("/api/token-allocations/reveal", {
            method: "POST",
            body: JSON.stringify({
              addressOfEpochAdmin: epochAdminAddressToReveal,
            }),
          });
        }}
      >
        Reveal
      </Button>
    </Container>
  );
}

function CollectRewardFunction() {
  const [
    epochAdminAddressToCollectReward,
    setEpochAdminAddressToCollectReward,
  ] = useState("");

  return (
    <Container>
      <h3>Collect Finalized Epoch Reward</h3>
      <Container>
        <TextField
          label="Epoch Admin Address"
          variant="outlined"
          placeholder="eg. 0x1"
          onChange={(e) => setEpochAdminAddressToCollectReward(e.target.value)}
        />
      </Container>
      <Button
        onClick={async () => {
          await collectEpochReward({
            addressOfEpochAdmin: epochAdminAddressToCollectReward,
          });
        }}
      >
        Collect Epoch Reward
      </Button>
    </Container>
  );
}

function ScheduleNewEpochFunction() {
  const [rewardBudget, setRewardBudget] = useState(0);
  const [members, setMembers] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dedicatedCoordinator, setDedicatedCoordinator] = useState("");

  return (
    <Container>
      <h3>Schedule New Epoch</h3>
      <Container>
        <TextField
          label="Reward Budget (in ETH)"
          type="number"
          variant="outlined"
          placeholder="eg. 5.5"
          onChange={(e) => setRewardBudget(parseFloat(e.target.value))}
        />
        <TextField
          label="Members (comma-separated, no spaces)"
          variant="outlined"
          placeholder="eg. 0x1,0x2"
          onChange={(e) => setMembers(e.target.value.split(","))}
        />
        <TextField
          label="Starts At (unix seconds)"
          type="number"
          variant="outlined"
          placeholder="eg. 1655854537"
          onChange={(e) => setStartsAt(parseInt(e.target.value))}
        />
        <TextField
          label="Duration (in seconds)"
          type="number"
          variant="outlined"
          placeholder="eg. 120 (2m)"
          onChange={(e) => setDuration(parseInt(e.target.value))}
        />
        <TextField
          label="Dedicated Coordinator"
          variant="outlined"
          placeholder="eg. 0x1"
          onChange={(e) => setDedicatedCoordinator(e.target.value)}
        />
      </Container>
      <Button
        onClick={() =>
          scheduleNewEpoch({
            rewardBudget,
            members,
            startsAt,
            duration,
            dedicatedCoordinator,
          })
        }
      >
        Schedule
      </Button>
    </Container>
  );
}

function ViewEpochDetailsFunction({
  connectedWalletAddress,
}: {
  connectedWalletAddress: string;
}) {
  const [epochAdminAddressToViewDetails, setEpochAdminAddressToViewDetails] =
    useState("");
  const [fetchedEpoch, setFetchedEpoch] = useState<Epoch | null>(null);

  return (
    <Container>
      <h3>View Any Epoch</h3>
      <Container>
        <TextField
          label="Epoch Admin Address"
          variant="outlined"
          placeholder="eg. 0x1"
          onChange={(e) => setEpochAdminAddressToViewDetails(e.target.value)}
        />
      </Container>
      <Button
        onClick={async () => {
          const epoch = await fetchEpoch(epochAdminAddressToViewDetails);
          setFetchedEpoch(epoch);
        }}
      >
        View Epoch
      </Button>
      {!!fetchedEpoch && (
        <EpochDetails
          epoch={fetchedEpoch}
          connectedWalletAddress={connectedWalletAddress}
        />
      )}
    </Container>
  );
}

// TODO: implement functionality to updateEpochMembers
export default function AdminFunctions({
  connectedWalletAddress,
}: {
  connectedWalletAddress: string;
}) {
  return (
    <Container>
      <Container>
        <h1>Admin Functions</h1>
      </Container>
      <ScheduleNewEpochFunction />
      <ViewEpochDetailsFunction
        connectedWalletAddress={connectedWalletAddress}
      />
      <RevealEpochFunction />
      <CollectRewardFunction />
    </Container>
  );
}
