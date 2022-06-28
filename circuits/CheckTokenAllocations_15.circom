pragma circom 2.0.0;
include "./CheckTokenAllocations.circom";
component main {public [pubTokenAllocationHash,allocatingMemberIdx,numMembers]}= CheckTokenAllocations(15);
