// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./CheckTokenAllocationsVerifier.sol";

contract EpochManager is CheckTokenAllocationsVerifier {
    // Each admin may only maintain 1 Epoch at any given time.
    mapping(address => Epoch) public adminEpochs;

    struct Epoch {
        uint256 rewardBudget;
        address[] members;
        bytes[] tokenAllocationCommitments;
        bool[] tokenAllocationCommitmentsVerified;
        uint256 startsAt;
        uint256 epochDuration;
        address dedicatedCoordinator;
        uint256[] revealedTokenAllocations;
    }

    // Address corresponds to the admin who created the Epoch.
    event EpochUpdated(address);
    event EpochFinalized(address);

    constructor() public {}

    /// Functions for setting up Epoch.

    function scheduleNewEpoch(
        uint256 rewardBudget,
        address[] memory members,
        uint256 startsAt,
        uint256 epochDuration,
        address dedicatedCoordinator
    ) public {
        // Check input for validity.
        require(
            members.length <= 15,
            "Cannot create Epoch involving more than 15 members"
        );
        require(startsAt > block.timestamp, "Epoch must start in the future");
        require(dedicatedCoordinator != address(0), "Must assign coordinator");

        // Update storage.
        Epoch storage newEpochToSchedule = adminEpochs[msg.sender];
        newEpochToSchedule.rewardBudget = rewardBudget;
        newEpochToSchedule.members = members;
        newEpochToSchedule.tokenAllocationCommitments = new bytes[](
            members.length
        );
        newEpochToSchedule.tokenAllocationCommitmentsVerified = new bool[](
            members.length
        );
        newEpochToSchedule.startsAt = startsAt;
        newEpochToSchedule.epochDuration = epochDuration;
        newEpochToSchedule.dedicatedCoordinator = dedicatedCoordinator;
    }

    function updateEpochMembers(address[] memory members)
        public
        onlyInactiveEpoch(msg.sender)
    {
        // Update Epoch.
        Epoch storage epochToUpdate = adminEpochs[msg.sender];
        epochToUpdate.members = members;
        epochToUpdate.tokenAllocationCommitments = new bytes[](members.length);
        epochToUpdate.tokenAllocationCommitmentsVerified = new bool[](
            members.length
        );

        // Emit event.
        emit EpochUpdated(msg.sender);
    }

    /// Functions for active Epochs.

    function updateTokenAllocationCommitment(
        address addressOfEpochAdmin,
        bytes memory commitment
    ) public onlyActiveEpoch(addressOfEpochAdmin) {
        // Get Epoch object.
        Epoch storage epochToUpdate = adminEpochs[addressOfEpochAdmin];

        // Unverified commitment must be from member.
        int256 epochMemberIdx = getEpochMemberIdx(epochToUpdate, msg.sender);
        require(epochMemberIdx > -1, "Commitment must be from Epoch member");

        // Update member commitment.
        epochToUpdate.tokenAllocationCommitments[
            uint256(epochMemberIdx)
        ] = commitment;

        // Emit event.
        emit EpochUpdated(addressOfEpochAdmin);
    }

    function submitTokenAllocationCommitmentProof(
        address addressOfEpochAdmin,
        address addressOfEpochMember,
        uint256[2] memory proofA,
        uint256[2][2] memory proofB,
        uint256[2] memory proofC,
        uint256[2] memory proofInput
    )
        public
        onlyEpochCoordinator(addressOfEpochAdmin)
        onlyActiveEpoch(addressOfEpochAdmin)
    {
        // Get Epoch object
        Epoch storage epochToUpdate = adminEpochs[addressOfEpochAdmin];

        // Commitment must be for Epoch member.
        int256 epochMemberIdx = getEpochMemberIdx(
            epochToUpdate,
            addressOfEpochMember
        );
        require(epochMemberIdx > -1, "Member not part of this Epoch");

        // Verify ZK proof.
        require(
            verifyProof(proofA, proofB, proofC, proofInput),
            "Proof must be valid"
        );

        // Mark commitment as verified.
        epochToUpdate.tokenAllocationCommitmentsVerified[
            uint256(epochMemberIdx)
        ] = true;

        // Emit event.
        emit EpochUpdated(addressOfEpochAdmin);
    }

    /// Functions for completed / expired Epochs.

    function submitRevealedTokenAllocations(
        address addressOfEpochAdmin,
        uint256[] memory finalTokenAllocations
    )
        public
        onlyEpochCoordinator(addressOfEpochAdmin)
        onlyInactiveEpoch(addressOfEpochAdmin)
    {
        // Get Epoch object
        Epoch storage epochToFinalize = adminEpochs[addressOfEpochAdmin];

        // Update Epoch struct.
        epochToFinalize.revealedTokenAllocations = finalTokenAllocations;

        // Emit event.
        emit EpochFinalized(addressOfEpochAdmin);
    }

    /// Function modifiers

    modifier onlyEpochCoordinator(address addressOfEpochAdmin) {
        // Require tx be sent from dedicated coordinator only.
        require(
            msg.sender == adminEpochs[addressOfEpochAdmin].dedicatedCoordinator,
            "Only dedicated coordinator is allowed to interact"
        );
        _;
    }

    modifier onlyActiveEpoch(address addressOfEpochAdmin) {
        // Epoch must be active.
        require(
            isEpochActive(adminEpochs[addressOfEpochAdmin]),
            "Epoch must be active"
        );
        _;
    }

    modifier onlyInactiveEpoch(address addressOfEpochAdmin) {
        // Epoch must not be active.
        require(
            !isEpochActive(adminEpochs[addressOfEpochAdmin]),
            "Epoch must be inactive"
        );
        _;
    }

    /// Private helper functions

    function getEpochMemberIdx(Epoch memory epoch, address addressToCheck)
        private
        pure
        returns (int256)
    {
        for (uint256 i = 0; i < epoch.members.length; i++) {
            if (addressToCheck == epoch.members[i]) {
                return int256(i);
            }
        }
        return -1;
    }

    function isEpochActive(Epoch memory epoch) private view returns (bool) {
        if (epoch.startsAt <= block.timestamp) {
            return epoch.startsAt + epoch.epochDuration >= block.timestamp;
        }

        return false;
    }
}
