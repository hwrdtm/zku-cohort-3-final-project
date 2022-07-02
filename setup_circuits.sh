#!/bin/bash

CIRCUIT_NAME=CheckTokenAllocations_15

cd circuits

# compile circuit
npx zkey-manager compile -c ./zkeys.config.yml

# download phase 1 trusted setup
npx zkey-manager downloadPtau -c ./zkeys.config.yml

# start a new zkey and make a phase 2 contribution
snarkjs groth16 setup ./zkeys/${CIRCUIT_NAME}_test.r1cs ./zkeys/powersOfTau28_hez_final_12.ptau ./zkeys/${CIRCUIT_NAME}_test.0.zkey

snarkjs zkey contribute ./zkeys/${CIRCUIT_NAME}_test.0.zkey ./zkeys/${CIRCUIT_NAME}_test.final.zkey --name="hwrdtm" -v -e="random text"

snarkjs zkey export verificationkey ./zkeys/${CIRCUIT_NAME}_test.final.zkey ./zkeys/verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier ./zkeys/${CIRCUIT_NAME}_test.final.zkey ../contracts/CheckTokenAllocationsVerifier.sol