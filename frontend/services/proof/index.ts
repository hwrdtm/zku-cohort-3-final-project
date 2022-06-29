import { ProofInput, SolidityProof, SolidityProofInput } from "../../models";

const snarkjs = require("snarkjs");

const wasmPath = "./CheckTokenAllocations_15.wasm";
const zkeyPath = "./CheckTokenAllocations_15.final.zkey";

export async function generateProof(
  inputs: ProofInput
): Promise<SolidityProofInput> {
  console.log("inputs", inputs);

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    wasmPath,
    zkeyPath
  );

  console.log("proof", proof, "publicSignals", publicSignals);

  const solidityProof: SolidityProof = buildSolidityProof(proof, publicSignals);

  console.log("solidity proof", solidityProof);

  return [
    solidityProof.a,
    solidityProof.b,
    solidityProof.c,
    solidityProof.input,
  ] as SolidityProofInput;
}

export function buildSolidityProof(
  snarkProof: any,
  publicSignals: any
): SolidityProof {
  return {
    a: snarkProof.pi_a.slice(0, 2),
    b: [[...snarkProof.pi_b[0].reverse()], [...snarkProof.pi_b[1].reverse()]],
    c: snarkProof.pi_c.slice(0, 2),
    input: publicSignals,
  } as SolidityProof;
}
