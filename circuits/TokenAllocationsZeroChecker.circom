pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux4.circom";

// n is the number of bits of the array index to check.
template TokenAllocationsZeroChecker(n) {
    signal input indexToCheck;
    signal input arrayToIndex[2**n];

    signal output out;

    // Use mux4 to "access" array at indexToCheck.
    // First convert index into binary with Num2Bits,
    // then assign to 's' variable of mux. Actual
    // array values go into 'c' variable of mux.
    component indexToCheckBinary = Num2Bits(n);
    indexToCheckBinary.in <== indexToCheck;

    component mux = Mux4();
    for (var i = 0; i < 2**n; i++) {
        mux.c[i] <== arrayToIndex[i];
    }

    for (var i = 0; i < n; i++) {
        mux.s[i] <== indexToCheckBinary.out[i];
    }

    // Finally, output zero checking result as signal.
    component eq = IsEqual();
    eq.in[0] <== 0;
    eq.in[1] <== mux.out;
    out <== eq.out;
}