pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template CheckTokenAllocations(n) {
    // Poseidon hashing only supports up to 15-th index so nInputs must be <= 16
    // Since we add a salt to the Poseidon hashing, token allocations must not
    // exceed 15 elements.
    assert(n >= 2 && n <= 15);

    // Public inputs
    signal input pubTokenAllocationHash;

    // Private inputs
    signal input tokenAllocations[n];
    signal input salt;

    // Output
    signal output tokenAllocationHash;

    // Check token allocation is positive
    component isAllocationPositive[n];
    for (var i = 0; i < n; i++) {
        isAllocationPositive[i] = GreaterEqThan(14);
        isAllocationPositive[i].in[0] <== tokenAllocations[i];
        isAllocationPositive[i].in[1] <== 0;
        isAllocationPositive[i].out === 1;
    }

    // Check token allocation is valid - sums to 10000 (basis points)
    var tokenAllocationsCumulative[n];
    tokenAllocationsCumulative[0] = tokenAllocations[0];
    for (var i = 1; i < n; i++) {
        tokenAllocationsCumulative[i] = tokenAllocationsCumulative[i-1] + tokenAllocations[i];
    }
    tokenAllocationsCumulative[n-1] === 10000;

    // Compute Poseidon hash of token allocation, verify for equality with
    // public commitment.
    component poseidon = Poseidon(n+1);
    poseidon.inputs[0] <== salt;
    for (var i = 0; i < n; i++) {
        poseidon.inputs[i+1] <== tokenAllocations[i];
    }
    tokenAllocationHash <== poseidon.out;
    pubTokenAllocationHash === tokenAllocationHash;
}

