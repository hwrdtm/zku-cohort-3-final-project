pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./RangeProof.circom";
include "./TokenAllocationsZeroChecker.circom";

template CheckTokenAllocations(n) {
    // Poseidon hashing only supports up to 15-th index so nInputs must be <= 16
    // Since we add a salt to the Poseidon hashing, token allocations must not
    // exceed 15 elements.
    assert(n >= 2 && n <= 15);

    // Public inputs
    signal input pubTokenAllocationHash;
    signal input allocatingMemberIdx;
    signal input numMembers;

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

    // Check that 0 <= numMembers <= 15.
    component numMembersRange = RangeProof(4);
    numMembersRange.in <== numMembers;
    numMembersRange.range[0] <== 0;
    numMembersRange.range[1] <== 15;
    numMembersRange.out === 1;

    // Check 0 <= allocatingMemberIdx <= numMembers - 1.
    component range = RangeProof(4);
    range.in <== allocatingMemberIdx;
    range.range[0] <== 0;
    range.range[1] <== numMembers - 1;
    range.out === 1;

    // Check 0 tokens allocated to member at allocatingMemberIdx.
    component allocatingMemberIdxZeroChecker = TokenAllocationsZeroChecker(4);
    allocatingMemberIdxZeroChecker.indexToCheck <== allocatingMemberIdx;
    for (var i = 0; i < 15; i++) {
        allocatingMemberIdxZeroChecker.arrayToIndex[i] <== tokenAllocations[i];
    }
    allocatingMemberIdxZeroChecker.arrayToIndex[15] <== 0; // random input
    allocatingMemberIdxZeroChecker.out === 1;

    // Check 0 tokens allocated to any array index >= numMembers.
    // Because we can't use control flow depending on
    // (indexToCheck >= numMembers) to perform zero checking,
    // we simply do zero checking against all array elements,
    // then assert the number of '1's output using flags.
    component outOfBoundMemberTokensZeroChecker[15];
    component outOfBoundMemberTokensZeroCheckerFlags[15];
    // Use intermediate signal for tracking number of '1's output.
    signal inter[16];
    inter[0] <== 0;
    for (var indexToCheck = 0; indexToCheck < 15; indexToCheck++) {
        // Initialize components.
        outOfBoundMemberTokensZeroChecker[indexToCheck] = TokenAllocationsZeroChecker(4);
        outOfBoundMemberTokensZeroCheckerFlags[indexToCheck] = GreaterEqThan(4);

        // Load zero checker component.
        outOfBoundMemberTokensZeroChecker[indexToCheck].indexToCheck <== indexToCheck;
        for (var i = 0; i < 15; i++) {
            outOfBoundMemberTokensZeroChecker[indexToCheck].arrayToIndex[i] <== tokenAllocations[i];
        }
        outOfBoundMemberTokensZeroChecker[indexToCheck].arrayToIndex[15] <== 0; // random input

        // Load flag component.
        outOfBoundMemberTokensZeroCheckerFlags[indexToCheck].in[0] <== indexToCheck;
        outOfBoundMemberTokensZeroCheckerFlags[indexToCheck].in[1] <== numMembers;

        // Track number of '1's output.
        inter[indexToCheck+1] <== inter[indexToCheck] + (outOfBoundMemberTokensZeroCheckerFlags[indexToCheck].out * outOfBoundMemberTokensZeroChecker[indexToCheck].out);
    }
    // Assert final sum to be (15 - numMembers).
    inter[15] === 15 - numMembers;

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

