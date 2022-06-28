import React, { useEffect, useState } from "react";
import EpochManager from "../../contracts/EpochManager.json";
import { providers, Contract } from "ethers";
import { Container } from "@mui/material";
import { Epoch } from "models";
import { fetchEpoch } from "services/epochManager";
import EpochDetails from "components/EpochDetails";
import { isAddressAdminOfEpoch, isAddressMemberOfEpoch } from "utils/epoch";
import config, { getContractAddress } from "config";

// As admin, view my created Epoch (if exist).
// It can either be:
//  - yet to start
//  - already started
//  - finished
//  - finalized

// As user, view Epochs I am part of.
// It can either be:
//  - yet to start
//  - already started
//  - finished
//  - finalized

export default function EpochListings({
  connectedWalletAddress,
}: {
  connectedWalletAddress: string;
}) {
  const [relevantEpochs, setRelevantEpochs] = useState<Epoch[]>([]);

  useEffect(() => {
    const provider = new providers.JsonRpcProvider(config.browserNodeUrl);
    const epochManagerContract = new Contract(
      getContractAddress(),
      EpochManager.abi,
      provider
    );

    epochManagerContract.on("EpochScheduled", async (addressOfEpochAdmin) => {
      console.log("New Epoch Scheduled By Admin", { addressOfEpochAdmin });

      // fetch epoch details
      const epochDetails = await fetchEpoch(addressOfEpochAdmin);

      if (!epochDetails) {
        return;
      }

      // if connected wallet is either admin or user, add to list to display
      if (
        isAddressAdminOfEpoch(connectedWalletAddress, epochDetails) ||
        isAddressMemberOfEpoch(connectedWalletAddress, epochDetails)
      ) {
        setRelevantEpochs([...relevantEpochs, epochDetails]);
      }
    });
  }, []); // HACK to avoid infinite loop

  return (
    <Container>
      <Container>
        <h1>Epoch Listings</h1>
      </Container>
      <Container>
        {relevantEpochs.map((relevantEpoch, idx) => (
          <EpochDetails
            key={idx}
            epoch={relevantEpoch}
            connectedWalletAddress={connectedWalletAddress}
          />
        ))}
      </Container>
    </Container>
  );
}
