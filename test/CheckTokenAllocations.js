const chai = require("chai");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);
const Fr = new F1Field(exports.p);

const assert = chai.assert;
const buildPoseidon = require("circomlibjs").buildPoseidon;

describe("CheckTokenAllocations circuit test", function () {
  this.timeout(100000000);

  let circuit;

  async function runFailureTest(circuitInstance, input) {
    let errorString;
    await circuitInstance.calculateWitness(input, true).catch((error) => {
      errorString = error.toString();
    });

    assert(errorString.includes("Error: Error: Assert Failed."));
  }

  before(async function () {
    circuit = await wasm_tester("circuits/CheckTokenAllocations_15.circom");
    await circuit.loadConstraints();
  });

  beforeEach(async function () {
    poseidonJs = await buildPoseidon();
  });

  it("Should fail for negative token allocation values", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "-1";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "1",
      numMembers: "1",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should fail for numMembers that are out of bounds", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1000";
    tokenAllocations[2] = "9000";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "1",
      numMembers: "16",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should fail for allocatingMemberIdx that are out of bounds", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1000";
    tokenAllocations[2] = "9000";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "10",
      numMembers: "10",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should fail for non-zero tokens allocated to member at allocatingMemberIdx", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1000";
    tokenAllocations[1] = "1";
    tokenAllocations[2] = "8999";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "1",
      numMembers: "10",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should fail for non-zero tokens allocated to any member at index >= numMembers", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1000";
    tokenAllocations[2] = "8999";
    tokenAllocations[3] = "1";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "1",
      numMembers: "3",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should fail for token allocation not totalling 10000 (basis points)", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1";
    tokenAllocations[2] = "2";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "1",
      numMembers: "3",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should fail for invalid pubTokenAllocationHash input", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1000";
    tokenAllocations[1] = "1";
    tokenAllocations[2] = "8999";
    const salt = "1";

    const INPUT = {
      pubTokenAllocationHash: "1",
      allocatingMemberIdx: "1",
      numMembers: "10",
      tokenAllocations,
      salt,
    };

    await runFailureTest(circuit, INPUT);
  });

  it("Should succeed for valid token allocations", async () => {
    const tokenAllocations = getDefaultTokenAllocations(15);
    tokenAllocations[0] = "1000";
    tokenAllocations[2] = "9000";
    const salt = "1";

    const pubTokenAllocationHash = ethers.BigNumber.from(
      poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
    ).toBigInt();

    const INPUT = {
      pubTokenAllocationHash,
      allocatingMemberIdx: "1",
      numMembers: "3",
      tokenAllocations,
      salt,
    };

    const witness = await circuit.calculateWitness(INPUT, true);

    assert(Fr.eq(Fr.e(witness[0]), Fr.e(1)));
    assert(Fr.eq(Fr.e(witness[1]), Fr.e(pubTokenAllocationHash)));
    assert(Fr.eq(Fr.e(witness[2]), Fr.e(pubTokenAllocationHash)));
    assert(Fr.eq(Fr.e(witness[3]), Fr.e("1")));
    assert(Fr.eq(Fr.e(witness[4]), Fr.e("3")));
  });
});

function getDefaultTokenAllocations(numberOfEpochMembersToAllocateTo) {
  return Array.apply(null, Array(numberOfEpochMembersToAllocateTo)).map(
    (_) => "0"
  );
}
