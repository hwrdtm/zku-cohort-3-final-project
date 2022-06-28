const { expect } = require("chai");
const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");
const buildPoseidon = require("circomlibjs").buildPoseidon;

describe("CheckTokenAllocationsVerifier.sol", function () {
  let Verifier;
  let verifier;

  beforeEach(async function () {
    Verifier = await ethers.getContractFactory("CheckTokenAllocationsVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();
    poseidonJs = await buildPoseidon();
  });

  it("Should return true for correct proof", async function () {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = 1000;
    tokenAllocations[2] = 9000;

    const salt = BigInt(9999999);

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const { proof, publicSignals } = await groth16.fullProve(
      {
        pubTokenAllocationHash,
        allocatingMemberIdx: 1,
        numMembers: 3,
        tokenAllocations: tokenAllocations,
        salt,
      },
      "frontend/public/CheckTokenAllocations_15.wasm",
      "frontend/public/CheckTokenAllocations_15.final.zkey"
    );

    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);
    const calldata = await groth16.exportSolidityCallData(
      editedProof,
      editedPublicSignals
    );

    const argv = calldata
      .replace(/["[\]\s]/g, "")
      .split(",")
      .map((x) => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
      [argv[2], argv[3]],
      [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input = argv.slice(8);

    expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
  });

  it("Should return false for invalid proof", async function () {
    let a = [0, 0];
    let b = [
      [0, 0],
      [0, 0],
    ];
    let c = [0, 0];
    let d = [0, 0, 0, 0];
    expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
  });
});

function unstringifyBigInts(o) {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    if (o === null) return null;
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

function getDefaultTokenAllocations(numberOfEpochMembersToAllocateTo) {
  return Array.apply(null, Array(numberOfEpochMembersToAllocateTo)).map(
    (_) => 0
  );
}
