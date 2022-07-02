// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.
async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy EpochManager contract
  const EpochManager = await ethers.getContractFactory("EpochManager");
  const epochManager = await EpochManager.deploy();
  await epochManager.deployed();
  console.log("EpochManager address:", epochManager.address);

  // We save the contract's deployment artifacts.
  saveDeploymentArtifacts(epochManager, network.name);
}

function saveDeploymentArtifacts(epochManager, network) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../contracts/deployment";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  const jsonString = fs.readFileSync(contractsDir + "/contract-address.json", {
    encoding: "utf-8",
  });

  // parse json
  const contractAddresses = JSON.parse(jsonString);

  // update json
  contractAddresses[network] = {
    EpochManager: epochManager.address,
  };

  // write file
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify(contractAddresses, undefined, 2)
  );

  const EpochManagerArtifact = artifacts.readArtifactSync("EpochManager");

  fs.writeFileSync(
    contractsDir + "/EpochManager.json",
    JSON.stringify(EpochManagerArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
