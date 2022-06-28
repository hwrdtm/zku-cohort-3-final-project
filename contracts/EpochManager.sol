// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./CheckTokenAllocationsVerifier.sol";

contract EpochManager is CheckTokenAllocationsVerifier {
    // Each admin may only maintain 1 Epoch at any given time.
    mapping(address => Epoch) public adminEpochs;

    struct Epoch {
        uint256 rewardBudget;
        address[] members;
        bytes32[] tokenAllocationCommitments;
        bool[] tokenAllocationCommitmentsVerified;
        uint256 startsAt;
        uint256 epochDuration;
        address dedicatedCoordinator;
        uint256[] revealedTokenAllocations;
        bool[] rewardWithdrawals;
        uint256 rewardBudgetPerToken;
    }

    // Address corresponds to the admin who created the Epoch.
    event EpochScheduled(address);
    event EpochUpdated(address);
    event EpochFinalized(address);

    /// Functions for setting up Epoch.

    function scheduleNewEpoch(
        address[] memory members,
        uint256 startsAt,
        uint256 epochDuration,
        address dedicatedCoordinator
    ) external payable {
        // Check input for validity.
        require(
            msg.value > 0,
            "Must send some funds to allocate during epoch."
        );
        require(
            members.length >= 2 && members.length <= 15,
            "Cannot create Epoch involving less than 2 members or more than 15 members"
        );
        require(startsAt > block.timestamp, "Epoch must start in the future");
        require(dedicatedCoordinator != address(0), "Must assign coordinator");

        // Update storage.
        Epoch storage newEpochToSchedule = adminEpochs[msg.sender];
        newEpochToSchedule.rewardBudget = msg.value;
        newEpochToSchedule.members = members;
        newEpochToSchedule.tokenAllocationCommitments = new bytes32[](
            members.length
        );
        newEpochToSchedule.tokenAllocationCommitmentsVerified = new bool[](
            members.length
        );
        newEpochToSchedule.revealedTokenAllocations = new uint256[](
            members.length
        );
        newEpochToSchedule.rewardWithdrawals = new bool[](members.length);

        // Calculate how much of rewardBudget would be sent to each epoch
        // member.
        // TODO: handle super small rewardBudget amounts (eg. in wei, less
        // than totalEpochTokens, causing 0 reward to send to each epoch
        // member due to floored division).
        uint256 totalEpochTokens = newEpochToSchedule.members.length * 10000;
        newEpochToSchedule.rewardBudgetPerToken =
            newEpochToSchedule.rewardBudget /
            totalEpochTokens;

        newEpochToSchedule.startsAt = startsAt;
        newEpochToSchedule.epochDuration = epochDuration;
        newEpochToSchedule.dedicatedCoordinator = dedicatedCoordinator;
        emit EpochScheduled(msg.sender);
    }

    function updateEpochMembers(address[] memory members)
        external
        onlyBeforeActiveEpoch(msg.sender)
    {
        // Update Epoch.
        Epoch storage epochToUpdate = adminEpochs[msg.sender];
        epochToUpdate.members = members;
        epochToUpdate.tokenAllocationCommitments = new bytes32[](
            members.length
        );
        epochToUpdate.tokenAllocationCommitmentsVerified = new bool[](
            members.length
        );
        epochToUpdate.revealedTokenAllocations = new uint256[](members.length);
        epochToUpdate.rewardWithdrawals = new bool[](members.length);

        // Calculate how much of rewardBudget would be sent to each epoch
        // member.
        uint256 totalEpochTokens = epochToUpdate.members.length * 10000;
        epochToUpdate.rewardBudgetPerToken =
            epochToUpdate.rewardBudget /
            totalEpochTokens;

        // Emit event.
        emit EpochUpdated(msg.sender);
    }

    /// Functions for active Epochs.

    function updateTokenAllocationCommitment(
        address addressOfEpochAdmin,
        bytes32 commitment
    ) external onlyActiveEpoch(addressOfEpochAdmin) {
        // Get Epoch object.
        Epoch storage epochToUpdate = adminEpochs[addressOfEpochAdmin];

        // Unverified commitment must be from member.
        int256 epochMemberIdx = _getEpochMemberIdx(epochToUpdate, msg.sender);
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
        uint256[4] memory proofInput
    )
        external
        onlyEpochCoordinator(addressOfEpochAdmin)
        onlyActiveEpoch(addressOfEpochAdmin)
    {
        // Get Epoch object
        Epoch storage epochToUpdate = adminEpochs[addressOfEpochAdmin];

        // Commitment must be for Epoch member.
        int256 epochMemberIdx = _getEpochMemberIdx(
            epochToUpdate,
            addressOfEpochMember
        );
        require(epochMemberIdx > -1, "Member not part of this Epoch");

        // Verify ZK proof.
        require(
            verifyProof(proofA, proofB, proofC, proofInput),
            "Proof must be valid"
        );

        // Check that the public input signal pubTokenAllocationHash
        // is the same as the commitment already submitted by the user.
        // As a reminder, proofInput[0] is output signal, 1st index onwards
        // are the public input signals.
        require(
            proofInput[1] ==
                bytes32ToUint(
                    epochToUpdate.tokenAllocationCommitments[
                        uint256(epochMemberIdx)
                    ]
                ),
            "pubTokenAllocationHash proof input does not match existing commitment"
        );

        // Check that the public input signal allocatingMemberIdx is
        // corresponding to the actual index of addressOfEpochMember within
        // the members array of the Epoch, and is not out of bounds.
        require(
            proofInput[2] == uint256(epochMemberIdx),
            "allocatingMemberIdx proof input is invalid"
        );

        // Check that the public input signal numMembers is corresponding
        // to the actual number of members within the members array of the
        // Epoch.
        require(
            proofInput[3] == epochToUpdate.members.length,
            "numMembers proof input is invalid"
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
        external
        onlyEpochCoordinator(addressOfEpochAdmin)
        onlyAfterActiveEpoch(addressOfEpochAdmin)
    {
        // Check that all token allocation commitments are verified before proceeding.
        require(
            isAllTokenAllocationCommitmentsVerified(addressOfEpochAdmin),
            "All token allocation commitments must be verified"
        );

        // Get Epoch object
        Epoch storage epochToFinalize = adminEpochs[addressOfEpochAdmin];

        // Update Epoch struct.
        for (uint256 i = 0; i < finalTokenAllocations.length; i++) {
            epochToFinalize.revealedTokenAllocations[i] = finalTokenAllocations[
                i
            ];
        }

        // Emit event.
        emit EpochFinalized(addressOfEpochAdmin);
    }

    function collectEpochReward(address addressOfEpochAdmin)
        external
        onlyAfterActiveEpoch(addressOfEpochAdmin)
    {
        // Check that epoch is finalized with revealed allocations.
        require(
            isEpochFinalized(addressOfEpochAdmin),
            "Epoch must be finalized before withdrawing funds"
        );

        // Get Epoch object
        Epoch storage epoch = adminEpochs[addressOfEpochAdmin];

        // Recipient must be an Epoch member.
        int256 epochMemberIdx = _getEpochMemberIdx(epoch, msg.sender);
        require(epochMemberIdx > -1, "Member not part of this Epoch");

        // Recipient must not have withdrawn previously.
        require(
            !epoch.rewardWithdrawals[uint256(epochMemberIdx)],
            "Reward must not have been withdrawn yet."
        );

        // Set flag.
        epoch.rewardWithdrawals[uint256(epochMemberIdx)] = true;

        // Send funds to epoch member.
        payable(msg.sender).transfer(
            epoch.revealedTokenAllocations[uint256(epochMemberIdx)] *
                epoch.rewardBudgetPerToken
        );
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

    modifier onlyBeforeActiveEpoch(address addressOfEpochAdmin) {
        // Epoch must not be active and must be before startsAt.
        require(
            !_isEpochActive(adminEpochs[addressOfEpochAdmin]) &&
                !_isEpochFinished(adminEpochs[addressOfEpochAdmin]),
            "Epoch must be inactive and not yet started"
        );
        _;
    }

    modifier onlyActiveEpoch(address addressOfEpochAdmin) {
        // Epoch must be active.
        require(
            _isEpochActive(adminEpochs[addressOfEpochAdmin]),
            "Epoch must be active"
        );
        _;
    }

    modifier onlyAfterActiveEpoch(address addressOfEpochAdmin) {
        // Epoch must not be active and must be after the duration.
        require(
            !_isEpochActive(adminEpochs[addressOfEpochAdmin]) &&
                _isEpochFinished(adminEpochs[addressOfEpochAdmin]),
            "Epoch must be inactive and finished"
        );
        _;
    }

    /// Public helper functions

    function isEpochActive(address addressOfEpochAdmin)
        public
        view
        returns (bool)
    {
        return _isEpochActive(adminEpochs[addressOfEpochAdmin]);
    }

    // An Epoch is finished when it is not active AND the time now is
    // after (startsAt + duration).
    function isEpochFinished(address addressOfEpochAdmin)
        public
        view
        returns (bool)
    {
        return _isEpochFinished(adminEpochs[addressOfEpochAdmin]);
    }

    // An Epoch is finalized when at least 1 of the elements in
    // revealedTokenAllocations is not 0.
    function isEpochFinalized(address addressOfEpochAdmin)
        public
        view
        returns (bool)
    {
        uint256[] memory revealedTokenAllocations = adminEpochs[
            addressOfEpochAdmin
        ].revealedTokenAllocations;
        for (uint256 i = 0; i < revealedTokenAllocations.length; i++) {
            if (revealedTokenAllocations[i] != 0) {
                return true;
            }
        }

        return false;
    }

    function isAllTokenAllocationCommitmentsVerified(
        address addressOfEpochAdmin
    ) public view returns (bool) {
        bool[] memory tokenAllocationCommitmentsVerified = adminEpochs[
            addressOfEpochAdmin
        ].tokenAllocationCommitmentsVerified;
        for (
            uint256 i = 0;
            i < tokenAllocationCommitmentsVerified.length;
            i++
        ) {
            if (tokenAllocationCommitmentsVerified[i] == false) {
                return false;
            }
        }
        return true;
    }

    function getEpochMembers(address addressOfEpochAdmin)
        public
        view
        returns (address[] memory)
    {
        Epoch memory epochToFetchFrom = adminEpochs[addressOfEpochAdmin];
        address[] memory membersToReturn = new address[](
            epochToFetchFrom.members.length
        );
        for (uint256 i = 0; i < epochToFetchFrom.members.length; i++) {
            membersToReturn[i] = epochToFetchFrom.members[i];
        }
        return membersToReturn;
    }

    function getEpochTokenAllocationCommitments(address addressOfEpochAdmin)
        public
        view
        returns (bytes32[] memory)
    {
        Epoch memory epochToFetchFrom = adminEpochs[addressOfEpochAdmin];
        bytes32[] memory tokenAllocationCommitmentsToReturn = new bytes32[](
            epochToFetchFrom.tokenAllocationCommitments.length
        );
        for (
            uint256 i = 0;
            i < epochToFetchFrom.tokenAllocationCommitments.length;
            i++
        ) {
            tokenAllocationCommitmentsToReturn[i] = epochToFetchFrom
                .tokenAllocationCommitments[i];
        }
        return tokenAllocationCommitmentsToReturn;
    }

    function getEpochTokenAllocationCommitmentsVerified(
        address addressOfEpochAdmin
    ) public view returns (bool[] memory) {
        Epoch memory epochToFetchFrom = adminEpochs[addressOfEpochAdmin];
        bool[] memory tokenAllocationCommitmentsVerifiedToReturn = new bool[](
            epochToFetchFrom.tokenAllocationCommitments.length
        );
        for (
            uint256 i = 0;
            i < epochToFetchFrom.tokenAllocationCommitmentsVerified.length;
            i++
        ) {
            tokenAllocationCommitmentsVerifiedToReturn[i] = epochToFetchFrom
                .tokenAllocationCommitmentsVerified[i];
        }
        return tokenAllocationCommitmentsVerifiedToReturn;
    }

    function getEpochRevealedTokenAllocations(address addressOfEpochAdmin)
        public
        view
        returns (uint256[] memory)
    {
        Epoch memory epochToFetchFrom = adminEpochs[addressOfEpochAdmin];
        uint256[] memory revealedTokenAllocationsToReturn = new uint256[](
            epochToFetchFrom.tokenAllocationCommitments.length
        );
        for (
            uint256 i = 0;
            i < epochToFetchFrom.revealedTokenAllocations.length;
            i++
        ) {
            revealedTokenAllocationsToReturn[i] = epochToFetchFrom
                .revealedTokenAllocations[i];
        }
        return revealedTokenAllocationsToReturn;
    }

    function getEpochRewardWithdrawals(address addressOfEpochAdmin)
        public
        view
        returns (bool[] memory)
    {
        Epoch memory epochToFetchFrom = adminEpochs[addressOfEpochAdmin];
        bool[] memory rewardWithdrawalsToReturn = new bool[](
            epochToFetchFrom.tokenAllocationCommitments.length
        );
        for (
            uint256 i = 0;
            i < epochToFetchFrom.rewardWithdrawals.length;
            i++
        ) {
            rewardWithdrawalsToReturn[i] = epochToFetchFrom.rewardWithdrawals[
                i
            ];
        }
        return rewardWithdrawalsToReturn;
    }

    /// Private helper functions

    function _getEpochMemberIdx(Epoch memory epoch, address addressToCheck)
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

    function _isEpochActive(Epoch memory epoch) private view returns (bool) {
        if (epoch.startsAt <= block.timestamp) {
            return epoch.startsAt + epoch.epochDuration >= block.timestamp;
        }

        return false;
    }

    function _isEpochFinished(Epoch memory epoch) private view returns (bool) {
        return !_isEpochActive(epoch) && epoch.startsAt <= block.timestamp;
    }

    function bytes32ToUint(bytes32 b) internal pure returns (uint256) {
        uint256 number;
        for (uint256 i = 0; i < b.length; i++) {
            number =
                number +
                uint256(uint8(b[i])) *
                (2**(8 * (b.length - (i + 1))));
        }
        return number;
    }
}
