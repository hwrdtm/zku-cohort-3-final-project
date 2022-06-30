import { ProofInput, SolidityProof, SolidityProofInput } from "../../models";
import path from "path";
import getConfig from "next/config";

const snarkjs = require("snarkjs");

const wasmPath = "/CheckTokenAllocations_15.wasm";
const zkeyPath = "/CheckTokenAllocations_15.final.zkey";

const serverPath = (staticFilePath: string) => {
  return path.join(
    getConfig().serverRuntimeConfig.PROJECT_ROOT,
    staticFilePath
  );
};

export async function generateProof(
  inputs: ProofInput
): Promise<SolidityProofInput> {
  console.log("inputs", inputs);

  await fetch(wasmPath);
  await fetch(zkeyPath);

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    serverPath(`/circuits${wasmPath}`),
    serverPath(`/circuits${zkeyPath}`)
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
