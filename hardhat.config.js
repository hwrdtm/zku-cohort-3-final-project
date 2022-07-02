require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const RINKEBY_PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY;
const HARMONY_DEVNET_PRIVATE_KEY = process.env.HARMONY_DEVNET_PRIVATE_KEY;
const HARMONY_MAINNET_PRIVATE_KEY = process.env.HARMONY_MAINNET_PRIVATE_KEY;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  networks: {
    harmonyDevnet: {
      url: `https://api.s0.ps.hmny.io/`,
      accounts: [`0x${HARMONY_DEVNET_PRIVATE_KEY}`],
    },
    harmonyMainnet: {
      url: `https://api.harmony.one`,
      accounts: [`0x${HARMONY_MAINNET_PRIVATE_KEY}`],
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/41e5bf69dc524d1c9d3b009c41675169",
      accounts: [`0x${RINKEBY_PRIVATE_KEY}`],
    },
    hardhat: {
      chainId: 1337,
    },
  },
  mocha: {
    bail: true,
  },
};
