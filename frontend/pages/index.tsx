import React, { useState } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import { Button, Container } from "@mui/material";
import { providers } from "ethers";
import EpochListings from "../components/EpochListings";
import AdminFunctions from "../components/AdminFunctions";

function LoggedInComponent(connectedWalletAddress: string) {
  return (
    <Container>
      <h1>Anonymous Coordinape</h1>
      <h3>Connected wallet: {connectedWalletAddress}</h3>
      <AdminFunctions connectedWalletAddress={connectedWalletAddress} />
      <EpochListings connectedWalletAddress={connectedWalletAddress} />
    </Container>
  );
}

function LoggedOutComponent(onClick: () => {}) {
  return (
    <Container>
      <h1>Anonymous Coordinape</h1>
      <Button onClick={onClick}>Connect MetaMask</Button>
    </Container>
  );
}

export default function Home() {
  const [connectedWalletAddress, setConnectedWalletAddress] = useState("");

  async function handleConnectWallet() {
    const provider = (await detectEthereumProvider()) as any;

    await provider.request({ method: "eth_requestAccounts" });

    const ethersProvider = new providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();

    const connectedWalletAddress = await signer.getAddress();

    setConnectedWalletAddress(connectedWalletAddress);
  }

  const PageComponent = !!connectedWalletAddress
    ? () => LoggedInComponent(connectedWalletAddress)
    : () => LoggedOutComponent(handleConnectWallet);

  return (
    <div>
      <PageComponent />
    </div>
  );
}
