const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/;

const verifierRegex = /contract Verifier/;

let content = fs.readFileSync("./contracts/CheckTokenAllocationsVerifier.sol", {
  encoding: "utf-8",
});
let bumped = content.replace(solidityRegex, "pragma solidity ^0.8.0");
bumped = bumped.replace(
  verifierRegex,
  "contract CheckTokenAllocationsVerifier"
);

fs.writeFileSync("./contracts/CheckTokenAllocationsVerifier.sol", bumped);
