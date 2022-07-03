# Getting Started

## Testing

First, setup circuits:

```
sh setup_circuits.sh
```

Run tests against circuit and smart contracts:

```
npx hardhat test
```

## Local Development

Start local hardhat node

```
npx hardhat node
```

Deploy contracts to local hardhat node

```
npx hardhat run --network localhost scripts/deploy-contracts.js
```

Copy the files in `contracts/deployment` and paste them in the Frontend repo `contracts` directory.

Head over to the Frontend repo, and start web server + API

```
npm run dev
```
