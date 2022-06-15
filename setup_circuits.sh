#!/bin/bash

cd circuits

# compile circuit
npx zkey-manager compile -c ./zkeys.config.yml

# download phase 1 trusted setup
npx zkey-manager downloadPtau -c ./zkeys.config.yml

# start a new zkey and make a phase 2 contribution
snarkjs groth16 setup ./zkeys/CheckTokenAllocations_10_test.r1cs ./zkeys/powersOfTau28_hez_final_11.ptau ./zkeys/CheckTokenAllocations_10_test.0.zkey

snarkjs zkey contribute ./zkeys/CheckTokenAllocations_10_test.0.zkey ./zkeys/CheckTokenAllocations_10_test.final.zkey --name="hwrdtm" -v -e="random text"

snarkjs zkey export verificationkey ./zkeys/CheckTokenAllocations_10_test.final.zkey ./zkeys/verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier ./zkeys/CheckTokenAllocations_10_test.final.zkey ../contracts/CheckTokenAllocationsVerifier.sol
