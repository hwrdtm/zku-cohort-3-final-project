const { expect } = require("chai");
const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");
const buildPoseidon = require("circomlibjs").buildPoseidon;

async function getCurrentBlockTimestamp() {
  const block = await ethers.provider.getBlock(
    await ethers.provider.getBlockNumber()
  );
  return block.timestamp;
}

function generateArrayWithValues(arrayLength, mapperFunc) {
  return Array.apply(null, Array(arrayLength)).map(mapperFunc);
}

describe("EpochManager.sol", function () {
  let EpochManager;
  let epochManager;

  beforeEach(async function () {
    EpochManager = await ethers.getContractFactory("EpochManager");
    epochManager = await EpochManager.deploy();
    await epochManager.deployed();

    poseidonJs = await buildPoseidon();
  });

  describe("modifiers", function () {
    it("Admin cannot update epoch members after it starts", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );

      // timetravel to after epoch has started
      await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
      await ethers.provider.send("evm_mine");

      // deployer immediately updates epoch members
      const updateTx = epochManager
        .connect(deployer)
        .updateEpochMembers([deployer.address, address1.address]);
      await expect(updateTx).to.be.revertedWith(
        "Epoch must be inactive and not yet started"
      );
    });

    it("Epoch members cannot update token allocation commitment before epoch is active", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );

      // epoch member tries to update token allocation commitment
      const updateCommitmentTx = epochManager
        .connect(address1)
        .updateTokenAllocationCommitment(
          deployer.address,
          ethers.utils.randomBytes(32)
        );
      await expect(updateCommitmentTx).to.be.revertedWith(
        "Epoch must be active"
      );
    });

    it("Epoch members cannot update token allocation commitment after epoch is finished", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // timetravel to 1s after epoch has finished
      const msUntilEpochFinished = msUntilEpochStarts + (10 + 1) * 1000;
      await ethers.provider.send("evm_increaseTime", [msUntilEpochFinished]);
      await ethers.provider.send("evm_mine");

      // epoch member tries to update token allocation commitment
      const updateCommitmentTx = epochManager
        .connect(address1)
        .updateTokenAllocationCommitment(
          deployer.address,
          ethers.utils.randomBytes(32)
        );
      await expect(updateCommitmentTx).to.be.revertedWith(
        "Epoch must be active"
      );
    });

    it("No one except coordinator can submit token allocation commitment proof", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // timetravel to when epoch is active
      await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
      await ethers.provider.send("evm_mine");

      // epoch member tries to submit commitment proof
      const submitProofTx = epochManager
        .connect(address1)
        .submitTokenAllocationCommitmentProof(
          deployer.address,
          address1.address,
          [0, 0],
          [
            [0, 0],
            [0, 0],
          ],
          [0, 0],
          [0, 0, 0, 0]
        );
      await expect(submitProofTx).to.be.revertedWith(
        "Only dedicated coordinator is allowed to interact"
      );
    });

    it("Coordinator cannot submit token allocation commitment proof before epoch is active", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // epoch member tries to submit commitment proof
      const submitProofTx = epochManager
        .connect(coordinator)
        .submitTokenAllocationCommitmentProof(
          deployer.address,
          address1.address,
          [0, 0],
          [
            [0, 0],
            [0, 0],
          ],
          [0, 0],
          [0, 0, 0, 0]
        );
      await expect(submitProofTx).to.be.revertedWith("Epoch must be active");
    });

    it("Coordinator cannot submit token allocation commitment proof after epoch is active", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // timetravel to 1s after epoch has finished
      const msUntilEpochFinished = msUntilEpochStarts + (10 + 1) * 1000;
      await ethers.provider.send("evm_increaseTime", [msUntilEpochFinished]);
      await ethers.provider.send("evm_mine");

      // coordinator tries to submit commitment proof
      const submitProofTx = epochManager
        .connect(coordinator)
        .submitTokenAllocationCommitmentProof(
          deployer.address,
          address1.address,
          [0, 0],
          [
            [0, 0],
            [0, 0],
          ],
          [0, 0],
          [0, 0, 0, 0]
        );
      await expect(submitProofTx).to.be.revertedWith("Epoch must be active");
    });

    it("No one except coordinator can submit revealed token allocations", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // timetravel to when epoch is active
      await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
      await ethers.provider.send("evm_mine");

      // epoch member tries to submit revealed token allocations
      const submitRevealedTokensTx = epochManager
        .connect(address1)
        .submitRevealedTokenAllocations(deployer.address, [0, 0]);
      await expect(submitRevealedTokensTx).to.be.revertedWith(
        "Only dedicated coordinator is allowed to interact"
      );
    });

    it("Coordinator cannot submit revealed token allocations before epoch is finished", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // timetravel to 1s before epoch has finished
      const msUntilEpochFinished = msUntilEpochStarts + (10 - 1) * 1000;
      await ethers.provider.send("evm_increaseTime", [msUntilEpochFinished]);
      await ethers.provider.send("evm_mine");

      // coordinator tries to submit commitment proof
      const submitRevealedTokensTx = epochManager
        .connect(coordinator)
        .submitRevealedTokenAllocations(deployer.address, [0, 0]);
      await expect(submitRevealedTokensTx).to.be.revertedWith(
        "Epoch must be inactive and finished"
      );
    });

    it("Epoch members cannot collect reward before epoch is finished", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      await epochManager.connect(deployer).scheduleNewEpoch(
        [address1.address, address2.address],
        startsAt,
        10000, // 10s duration
        coordinator.address,
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      // timetravel to 1s before epoch has finished
      const msUntilEpochFinished = msUntilEpochStarts + (10 - 1) * 1000;
      await ethers.provider.send("evm_increaseTime", [msUntilEpochFinished]);
      await ethers.provider.send("evm_mine");

      // epoch member tries to collect reward
      const collectRewardTx = epochManager
        .connect(address1)
        .collectEpochReward(deployer.address);
      await expect(collectRewardTx).to.be.revertedWith(
        "Epoch must be inactive and finished"
      );
    });
  });

  describe("scheduleNewEpoch", function () {
    describe("fail", function () {
      it("Cannot schedule new epoch without sending some value", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleEpochTx = epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address
          );
        await expect(scheduleEpochTx).to.be.revertedWith(
          "Must send some funds to allocate during epoch."
        );
      });

      it("Cannot schedule new epoch with too few members", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleEpochTx = epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await expect(scheduleEpochTx).to.be.revertedWith(
          "Cannot create Epoch involving less than 2 members or more than 15 members"
        );
      });

      it("Cannot schedule new epoch with too many members", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleEpochTx = epochManager.connect(deployer).scheduleNewEpoch(
          generateArrayWithValues(16, (_) => address1.address),
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
        await expect(scheduleEpochTx).to.be.revertedWith(
          "Cannot create Epoch involving less than 2 members or more than 15 members"
        );
      });

      it("Cannot schedule new epoch in the past", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const scheduleEpochTx = epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            blockTimestamp,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await expect(scheduleEpochTx).to.be.revertedWith(
          "Epoch must start in the future"
        );
      });

      it("Cannot schedule new epoch with zero-address as coordinator", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleEpochTx = epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            ethers.constants.AddressZero,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await expect(scheduleEpochTx).to.be.revertedWith(
          "Must assign coordinator"
        );
      });
    });

    describe("succeed", function () {
      it("Anyone can schedule a new epoch", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // address1 creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(address1)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // fetch details of epoch
        const epoch = await epochManager.adminEpochs(address1.address);
        expect(epoch.startsAt.toString()).to.eq(startsAt.toString());
      });
    });
  });

  describe("updateEpochMembers", function () {
    describe("succeed", function () {
      it("Admin can update epoch members before it starts", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // address1 creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(address1)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // fetch details of epoch
        const epochMembers = await epochManager.getEpochMembers(
          address1.address
        );
        expect(epochMembers.length).to.eq(2);
        expect(epochMembers[0]).to.eq(address1.address);
        expect(epochMembers[1]).to.eq(address2.address);

        // address1 can update epoch members before it starts
        const updateMembersTx = await epochManager
          .connect(address1)
          .updateEpochMembers([deployer.address, address2.address]);
        await updateMembersTx.wait();

        // fetch details of epoch again
        const updatedEpochMembers = await epochManager.getEpochMembers(
          address1.address
        );
        expect(updatedEpochMembers.length).to.eq(2);
        expect(updatedEpochMembers[0]).to.eq(deployer.address);
        expect(updatedEpochMembers[1]).to.eq(address2.address);
      });
    });
  });

  describe("updateTokenAllocationCommitment", function () {
    describe("succeed", function () {
      it("Epoch members can update token allocation commitment while it is active", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // address1 updates token allocation commitment
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs(["1"]))
        );
        const updateCommitmentTx = await epochManager
          .connect(address1)
          .updateTokenAllocationCommitment(
            deployer.address,
            pubTokenAllocationHash
          );
        await updateCommitmentTx.wait();

        // fetch details of epoch
        const epochTokenAllocationCommitments =
          await epochManager.getEpochTokenAllocationCommitments(
            deployer.address
          );
        expect(epochTokenAllocationCommitments.length).to.eq(2);
        expect(epochTokenAllocationCommitments[0]).to.eq(
          pubTokenAllocationHash
        );
        expect(epochTokenAllocationCommitments[1]).to.eq(
          ethers.BigNumber.from("0")
        );
      });

      it("Epoch members can update token allocation commitment AGAIN after previous one has been verified", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // address1 updates commitment and coordinator submits proof
        const tokenAllocations = generateArrayWithValues(15, (_) => 0);
        tokenAllocations[1] = 10000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address1,
          coordinator,
          {
            tokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 0,
            numMembers: 2,
          }
        );

        // fetch details of epoch
        const epochTokenAllocationCommitmentsVerified =
          await epochManager.getEpochTokenAllocationCommitmentsVerified(
            deployer.address
          );
        expect(epochTokenAllocationCommitmentsVerified[0]).to.eq(true);
        expect(epochTokenAllocationCommitmentsVerified[1]).to.eq(false);

        // address1 updates token allocation commitment AGAIN
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs(["1"]))
        );
        const updateCommitmentTx = await epochManager
          .connect(address1)
          .updateTokenAllocationCommitment(
            deployer.address,
            pubTokenAllocationHash
          );
        await updateCommitmentTx.wait();

        // fetch details of epoch AGAIN
        const epochTokenAllocationCommitmentsVerified2 =
          await epochManager.getEpochTokenAllocationCommitmentsVerified(
            deployer.address
          );
        expect(epochTokenAllocationCommitmentsVerified2[0]).to.eq(false);
        expect(epochTokenAllocationCommitmentsVerified2[1]).to.eq(false);
      });
    });

    describe("fail", function () {
      it("Epoch members cannot update token allocation commitment for epoch they are not a part of", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // address2 creates another epoch
        const scheduleTx2 = await epochManager
          .connect(address2)
          .scheduleNewEpoch(
            [deployer.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx2.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // address1 updates token allocation commitment
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs(["1"]))
        );
        const updateCommitmentTx = epochManager
          .connect(address1)
          .updateTokenAllocationCommitment(
            address2.address,
            pubTokenAllocationHash
          );
        await expect(updateCommitmentTx).to.be.revertedWith(
          "Commitment must be from Epoch member"
        );
      });
    });
  });

  describe("submitTokenAllocationCommitmentProof", function () {
    describe("succeed", function () {
      it("Coordinator can submit token allocation commitment proof", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // address1 updates token allocation commitment
        const tokenAllocations = generateArrayWithValues(15, (_) => 0);
        tokenAllocations[0] = 1000;
        tokenAllocations[2] = 9000;

        const salt = BigInt(9999999);
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
        );
        const updateCommitmentTx = await epochManager
          .connect(address1)
          .updateTokenAllocationCommitment(
            deployer.address,
            pubTokenAllocationHash
          );
        await updateCommitmentTx.wait();

        // fetch epoch details
        const epochTokenAllocationCommitmentsVerified =
          await epochManager.getEpochTokenAllocationCommitmentsVerified(
            deployer.address
          );
        expect(epochTokenAllocationCommitmentsVerified.length).to.eq(3);
        expect(epochTokenAllocationCommitmentsVerified[0]).to.eq(false);
        expect(epochTokenAllocationCommitmentsVerified[1]).to.eq(false);
        expect(epochTokenAllocationCommitmentsVerified[2]).to.eq(false);

        // generate proof
        const { proofA, proofB, proofC, proofInput } = await generateProof({
          pubTokenAllocationHash: pubTokenAllocationHash.toBigInt(),
          allocatingMemberIdx: 1,
          numMembers: 3,
          tokenAllocations,
          salt,
        });

        // coordinator submits proof
        const submitProofTx = await epochManager
          .connect(coordinator)
          .submitTokenAllocationCommitmentProof(
            deployer.address,
            address1.address,
            proofA,
            proofB,
            proofC,
            proofInput
          );
        await submitProofTx.wait();

        // fetch epoch details again
        const newEpochTokenAllocationCommitmentsVerified =
          await epochManager.getEpochTokenAllocationCommitmentsVerified(
            deployer.address
          );
        expect(newEpochTokenAllocationCommitmentsVerified.length).to.eq(3);
        expect(newEpochTokenAllocationCommitmentsVerified[0]).to.eq(false);
        expect(newEpochTokenAllocationCommitmentsVerified[1]).to.eq(true);
        expect(newEpochTokenAllocationCommitmentsVerified[2]).to.eq(false);
      });
    });

    describe("fail", function () {
      it("Coordinator cannot submit token allocation commitment proof for non-existent member", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // coordinator submits proof
        const submitProofTx = epochManager
          .connect(coordinator)
          .submitTokenAllocationCommitmentProof(
            deployer.address,
            deployer.address,
            [0, 0],
            [
              [0, 0],
              [0, 0],
            ],
            [0, 0],
            [0, 0, 0, 0]
          );
        await expect(submitProofTx).to.be.revertedWith(
          "Member not part of this Epoch"
        );
      });

      it("Coordinator cannot submit token allocation commitment proof for invalid proof parameters", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // coordinator submits proof
        const submitProofTx = epochManager
          .connect(coordinator)
          .submitTokenAllocationCommitmentProof(
            deployer.address,
            address1.address,
            [0, 0],
            [
              [0, 0],
              [0, 0],
            ],
            [0, 0],
            [0, 0, 0, 0]
          );
        await expect(submitProofTx).to.be.revertedWith("Proof must be valid");
      });

      it("Coordinator cannot submit token allocation commitment proof using invalid commitment hash as public input", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // generate proof
        const tokenAllocations = generateArrayWithValues(15, (_) => 0);
        tokenAllocations[0] = 1000;
        tokenAllocations[2] = 9000;

        const salt = BigInt(9999999);
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
        );
        const { proofA, proofB, proofC, proofInput } = await generateProof({
          pubTokenAllocationHash: pubTokenAllocationHash.toBigInt(),
          allocatingMemberIdx: 1,
          numMembers: 3,
          tokenAllocations,
          salt,
        });

        // coordinator submits proof
        const submitProofTx = epochManager
          .connect(coordinator)
          .submitTokenAllocationCommitmentProof(
            deployer.address,
            address1.address,
            proofA,
            proofB,
            proofC,
            proofInput
          );
        await expect(submitProofTx).to.be.revertedWith(
          "pubTokenAllocationHash proof input does not match existing commitment"
        );
      });

      it("Coordinator cannot submit token allocation commitment proof using invalid allocating member index as public input", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // address1 updates token allocation commitment
        const tokenAllocations = generateArrayWithValues(15, (_) => 0);
        tokenAllocations[2] = 10000;

        const salt = BigInt(9999999);
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
        );
        const updateCommitmentTx = await epochManager
          .connect(address1)
          .updateTokenAllocationCommitment(
            deployer.address,
            pubTokenAllocationHash
          );
        await updateCommitmentTx.wait();

        // generate proof
        const { proofA, proofB, proofC, proofInput } = await generateProof({
          pubTokenAllocationHash: pubTokenAllocationHash.toBigInt(),
          allocatingMemberIdx: 0,
          numMembers: 3,
          tokenAllocations,
          salt,
        });

        // coordinator submits proof
        const submitProofTx = epochManager
          .connect(coordinator)
          .submitTokenAllocationCommitmentProof(
            deployer.address,
            address1.address,
            proofA,
            proofB,
            proofC,
            proofInput
          );
        await expect(submitProofTx).to.be.revertedWith(
          "allocatingMemberIdx proof input is invalid"
        );
      });

      it("Coordinator cannot submit token allocation commitment proof using invalid epoch member length as public input", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // address1 updates token allocation commitment
        const tokenAllocations = generateArrayWithValues(15, (_) => 0);
        tokenAllocations[2] = 10000;

        const salt = BigInt(9999999);
        const pubTokenAllocationHash = ethers.BigNumber.from(
          poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
        );
        const updateCommitmentTx = await epochManager
          .connect(address1)
          .updateTokenAllocationCommitment(
            deployer.address,
            pubTokenAllocationHash
          );
        await updateCommitmentTx.wait();

        // generate proof
        const { proofA, proofB, proofC, proofInput } = await generateProof({
          pubTokenAllocationHash: pubTokenAllocationHash.toBigInt(),
          allocatingMemberIdx: 1,
          numMembers: 4,
          tokenAllocations,
          salt,
        });

        // coordinator submits proof
        const submitProofTx = epochManager
          .connect(coordinator)
          .submitTokenAllocationCommitmentProof(
            deployer.address,
            address1.address,
            proofA,
            proofB,
            proofC,
            proofInput
          );
        await expect(submitProofTx).to.be.revertedWith(
          "numMembers proof input is invalid"
        );
      });
    });
  });

  describe("submitRevealedTokenAllocations", function () {
    describe("succeed", function () {
      it("Coordinator can submit revealed token allocations", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // deployer updates token allocation commitment + coordinator submits proof
        const deployerTokenAllocations = generateArrayWithValues(15, (_) => 0);
        deployerTokenAllocations[1] = 2000;
        deployerTokenAllocations[2] = 8000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          deployer,
          coordinator,
          {
            tokenAllocations: deployerTokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 0,
            numMembers: 3,
          }
        );

        // address1 updates token allocation commitment + coordinator submits proof
        const address1TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address1TokenAllocations[0] = 1000;
        address1TokenAllocations[2] = 9000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address1,
          coordinator,
          {
            tokenAllocations: address1TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 1,
            numMembers: 3,
          }
        );

        // address2 updates token allocation commitment + coordinator submits proof
        const address2TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address2TokenAllocations[0] = 3000;
        address2TokenAllocations[1] = 7000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address2,
          coordinator,
          {
            tokenAllocations: address2TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 2,
            numMembers: 3,
          }
        );

        // fetch epoch details
        const epochTokenAllocationCommitmentsVerified =
          await epochManager.getEpochTokenAllocationCommitmentsVerified(
            deployer.address
          );
        expect(epochTokenAllocationCommitmentsVerified.length).to.eq(3);
        expect(epochTokenAllocationCommitmentsVerified[0]).to.eq(true);
        expect(epochTokenAllocationCommitmentsVerified[1]).to.eq(true);
        expect(epochTokenAllocationCommitmentsVerified[2]).to.eq(true);

        // timetravel again to 1s after epoch is finished
        await ethers.provider.send("evm_increaseTime", [(10 + 1) * 1000]);
        await ethers.provider.send("evm_mine");

        // coordinator submits revealed token allocations
        const submitRevealedAllocationsTx = await epochManager
          .connect(coordinator)
          .submitRevealedTokenAllocations(
            deployer.address,
            [4000, 9000, 17000]
          );
        await submitRevealedAllocationsTx.wait();

        // fetch epoch details
        const epochRevealedTokenAllocations =
          await epochManager.getEpochRevealedTokenAllocations(deployer.address);
        expect(epochRevealedTokenAllocations.length).to.eq(3);
        expect(epochRevealedTokenAllocations[0]).to.eq(4000);
        expect(epochRevealedTokenAllocations[1]).to.eq(9000);
        expect(epochRevealedTokenAllocations[2]).to.eq(17000);
      });
    });

    describe("fail", function () {
      it("Coordinator cannot submit revealed token allocations when not all have been verified with a proof", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // deployer updates token allocation commitment + coordinator submits proof
        const deployerTokenAllocations = generateArrayWithValues(15, (_) => 0);
        deployerTokenAllocations[1] = 2000;
        deployerTokenAllocations[2] = 8000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          deployer,
          coordinator,
          {
            tokenAllocations: deployerTokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 0,
            numMembers: 3,
          }
        );

        // fetch epoch details
        const epochTokenAllocationCommitmentsVerified =
          await epochManager.getEpochTokenAllocationCommitmentsVerified(
            deployer.address
          );
        expect(epochTokenAllocationCommitmentsVerified.length).to.eq(3);
        expect(epochTokenAllocationCommitmentsVerified[0]).to.eq(true);
        expect(epochTokenAllocationCommitmentsVerified[1]).to.eq(false);
        expect(epochTokenAllocationCommitmentsVerified[2]).to.eq(false);

        // timetravel again to 1s after epoch is finished
        await ethers.provider.send("evm_increaseTime", [(10 + 1) * 1000]);
        await ethers.provider.send("evm_mine");

        // coordinator submits revealed token allocations
        const submitRevealedAllocationsTx = epochManager
          .connect(coordinator)
          .submitRevealedTokenAllocations(
            deployer.address,
            [4000, 9000, 17000]
          );
        await expect(submitRevealedAllocationsTx).to.be.revertedWith(
          "All token allocation commitments must be verified"
        );
      });
    });
  });

  describe("collectEpochReward", function () {
    describe("succeed", function () {
      it("Epoch members can collect their rewards", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // deployer updates token allocation commitment + coordinator submits proof
        const deployerTokenAllocations = generateArrayWithValues(15, (_) => 0);
        deployerTokenAllocations[1] = 2000;
        deployerTokenAllocations[2] = 8000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          deployer,
          coordinator,
          {
            tokenAllocations: deployerTokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 0,
            numMembers: 3,
          }
        );

        // address1 updates token allocation commitment + coordinator submits proof
        const address1TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address1TokenAllocations[0] = 1000;
        address1TokenAllocations[2] = 9000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address1,
          coordinator,
          {
            tokenAllocations: address1TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 1,
            numMembers: 3,
          }
        );

        // address2 updates token allocation commitment + coordinator submits proof
        const address2TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address2TokenAllocations[0] = 3000;
        address2TokenAllocations[1] = 7000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address2,
          coordinator,
          {
            tokenAllocations: address2TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 2,
            numMembers: 3,
          }
        );

        // timetravel again to 1s after epoch is finished
        await ethers.provider.send("evm_increaseTime", [(10 + 1) * 1000]);
        await ethers.provider.send("evm_mine");

        // coordinator submits revealed token allocations
        const submitRevealedAllocationsTx = await epochManager
          .connect(coordinator)
          .submitRevealedTokenAllocations(
            deployer.address,
            [4000, 9000, 17000]
          );
        await submitRevealedAllocationsTx.wait();

        // deployer collects reward
        const oldBalance = await deployer.getBalance();
        const collectRewardTx = await epochManager
          .connect(deployer)
          .collectEpochReward(deployer.address);
        const collectRewardTxReceipt = await collectRewardTx.wait();
        const actualNewBalance = await deployer.getBalance();

        // assert balances
        const epoch = await epochManager.adminEpochs(deployer.address);
        const rewardInWei = epoch.rewardBudgetPerToken.mul(4000);
        const gasPaidInwei = ethers.utils.parseUnits(
          collectRewardTxReceipt.cumulativeGasUsed
            .mul(collectRewardTxReceipt.effectiveGasPrice)
            .toString(),
          "wei"
        );
        const expectedNewBalance = oldBalance
          .add(rewardInWei)
          .sub(gasPaidInwei);

        expect(actualNewBalance).to.be.eq(expectedNewBalance);
      });
    });

    describe("fail", function () {
      it("Epoch members cannot collect their rewards when epoch is not finalized yet", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to 1s after epoch is finished
        await ethers.provider.send("evm_increaseTime", [
          msUntilEpochStarts + (10 + 1) * 1000,
        ]);
        await ethers.provider.send("evm_mine");

        // deployer collects reward
        const collectRewardTx = epochManager
          .connect(deployer)
          .collectEpochReward(deployer.address);
        await expect(collectRewardTx).to.be.revertedWith(
          "Epoch must be finalized before withdrawing funds"
        );
      });

      it("Epoch members cannot collect rewards if they are not part of the epoch", async function () {
        const [deployer, address1, address2, coordinator, address3] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // deployer updates token allocation commitment + coordinator submits proof
        const deployerTokenAllocations = generateArrayWithValues(15, (_) => 0);
        deployerTokenAllocations[1] = 2000;
        deployerTokenAllocations[2] = 8000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          deployer,
          coordinator,
          {
            tokenAllocations: deployerTokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 0,
            numMembers: 3,
          }
        );

        // address1 updates token allocation commitment + coordinator submits proof
        const address1TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address1TokenAllocations[0] = 1000;
        address1TokenAllocations[2] = 9000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address1,
          coordinator,
          {
            tokenAllocations: address1TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 1,
            numMembers: 3,
          }
        );

        // address2 updates token allocation commitment + coordinator submits proof
        const address2TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address2TokenAllocations[0] = 3000;
        address2TokenAllocations[1] = 7000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address2,
          coordinator,
          {
            tokenAllocations: address2TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 2,
            numMembers: 3,
          }
        );

        // timetravel again to 1s after epoch is finished
        await ethers.provider.send("evm_increaseTime", [(10 + 1) * 1000]);
        await ethers.provider.send("evm_mine");

        // coordinator submits revealed token allocations
        const submitRevealedAllocationsTx = await epochManager
          .connect(coordinator)
          .submitRevealedTokenAllocations(
            deployer.address,
            [4000, 9000, 17000]
          );
        await submitRevealedAllocationsTx.wait();

        // address3 collects reward
        const collectRewardTx = epochManager
          .connect(address3)
          .collectEpochReward(deployer.address);
        await expect(collectRewardTx).to.be.revertedWith(
          "Member not part of this Epoch"
        );
      });

      it("Epoch members cannot collect rewards more than once", async function () {
        const [deployer, address1, address2, coordinator] =
          await ethers.getSigners();

        // deployer creates new epoch
        const blockTimestamp = await getCurrentBlockTimestamp();
        const msUntilEpochStarts = 1 * 1000;
        const startsAt = blockTimestamp + msUntilEpochStarts;
        const scheduleTx = await epochManager
          .connect(deployer)
          .scheduleNewEpoch(
            [deployer.address, address1.address, address2.address],
            startsAt,
            10000,
            coordinator.address,
            {
              value: ethers.utils.parseEther("10"),
            }
          );
        await scheduleTx.wait();

        // timetravel to when epoch is active
        await ethers.provider.send("evm_increaseTime", [msUntilEpochStarts]);
        await ethers.provider.send("evm_mine");

        // deployer updates token allocation commitment + coordinator submits proof
        const deployerTokenAllocations = generateArrayWithValues(15, (_) => 0);
        deployerTokenAllocations[1] = 2000;
        deployerTokenAllocations[2] = 8000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          deployer,
          coordinator,
          {
            tokenAllocations: deployerTokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 0,
            numMembers: 3,
          }
        );

        // address1 updates token allocation commitment + coordinator submits proof
        const address1TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address1TokenAllocations[0] = 1000;
        address1TokenAllocations[2] = 9000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address1,
          coordinator,
          {
            tokenAllocations: address1TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 1,
            numMembers: 3,
          }
        );

        // address2 updates token allocation commitment + coordinator submits proof
        const address2TokenAllocations = generateArrayWithValues(15, (_) => 0);
        address2TokenAllocations[0] = 3000;
        address2TokenAllocations[1] = 7000;
        await signerUpdatesCommitmentAndCoordinatorSubmitsProof(
          epochManager,
          address2,
          coordinator,
          {
            tokenAllocations: address2TokenAllocations,
            salt: "1",
            addressOfEpochAdmin: deployer.address,
            allocatingMemberIdx: 2,
            numMembers: 3,
          }
        );

        // timetravel again to 1s after epoch is finished
        await ethers.provider.send("evm_increaseTime", [(10 + 1) * 1000]);
        await ethers.provider.send("evm_mine");

        // coordinator submits revealed token allocations
        const submitRevealedAllocationsTx = await epochManager
          .connect(coordinator)
          .submitRevealedTokenAllocations(
            deployer.address,
            [4000, 9000, 17000]
          );
        await submitRevealedAllocationsTx.wait();

        // deployer collects reward
        const collectRewardTx = await epochManager
          .connect(deployer)
          .collectEpochReward(deployer.address);
        await collectRewardTx.wait();

        // deployer collects reward again
        const collectRewardTx2 = epochManager
          .connect(deployer)
          .collectEpochReward(deployer.address);
        await expect(collectRewardTx2).to.be.revertedWith(
          "Reward must not have been withdrawn yet."
        );
      });
    });
  });

  describe("Public helper functions", function () {
    it("isEpochActive should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const isEpochActive = await epochManager.isEpochActive(deployer.address);
      expect(isEpochActive).to.be.false;
    });

    it("isEpochFinished should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const isEpochFinished = await epochManager.isEpochFinished(
        deployer.address
      );
      expect(isEpochFinished).to.be.false;
    });

    it("isEpochFinalized should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const isEpochFinalized = await epochManager.isEpochFinalized(
        deployer.address
      );
      expect(isEpochFinalized).to.be.false;
    });

    it("isAllTokenAllocationCommitmentsVerified should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const isAllTokenAllocationCommitmentsVerified =
        await epochManager.isAllTokenAllocationCommitmentsVerified(
          deployer.address
        );
      expect(isAllTokenAllocationCommitmentsVerified).to.be.false;
    });

    it("getEpochMembers should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const epochMembers = await epochManager.getEpochMembers(deployer.address);
      expect(epochMembers.length).to.be.eq(3);
      expect(epochMembers[0]).to.be.eq(deployer.address);
      expect(epochMembers[1]).to.be.eq(address1.address);
      expect(epochMembers[2]).to.be.eq(address2.address);
    });

    it("getEpochTokenAllocationCommitments should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const epochTokenAllocationCommitments =
        await epochManager.getEpochTokenAllocationCommitments(deployer.address);
      expect(epochTokenAllocationCommitments.length).to.be.eq(3);
    });

    it("getEpochTokenAllocationCommitmentsVerified should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const epochTokenAllocationCommitmentsVerified =
        await epochManager.getEpochTokenAllocationCommitmentsVerified(
          deployer.address
        );
      expect(epochTokenAllocationCommitmentsVerified.length).to.be.eq(3);
      expect(epochTokenAllocationCommitmentsVerified[0]).to.be.false;
      expect(epochTokenAllocationCommitmentsVerified[1]).to.be.false;
      expect(epochTokenAllocationCommitmentsVerified[2]).to.be.false;
    });

    it("getEpochRevealedTokenAllocations should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const epochRevealedTokenAllocations =
        await epochManager.getEpochRevealedTokenAllocations(deployer.address);
      expect(epochRevealedTokenAllocations.length).to.be.eq(3);
      expect(epochRevealedTokenAllocations[0]).to.be.eq(0);
      expect(epochRevealedTokenAllocations[1]).to.be.eq(0);
      expect(epochRevealedTokenAllocations[2]).to.be.eq(0);
    });

    it("getEpochRewardWithdrawals should work", async function () {
      const [deployer, address1, address2, coordinator] =
        await ethers.getSigners();

      // deployer creates new epoch
      const blockTimestamp = await getCurrentBlockTimestamp();
      const msUntilEpochStarts = 1 * 1000;
      const startsAt = blockTimestamp + msUntilEpochStarts;
      const scheduleTx = await epochManager
        .connect(deployer)
        .scheduleNewEpoch(
          [deployer.address, address1.address, address2.address],
          startsAt,
          10000,
          coordinator.address,
          {
            value: ethers.utils.parseEther("10"),
          }
        );
      await scheduleTx.wait();

      // query
      const epochRewardWithdrawals =
        await epochManager.getEpochRewardWithdrawals(deployer.address);
      expect(epochRewardWithdrawals.length).to.be.eq(3);
      expect(epochRewardWithdrawals[0]).to.be.false;
      expect(epochRewardWithdrawals[1]).to.be.false;
      expect(epochRewardWithdrawals[2]).to.be.false;
    });
  });
});

async function signerUpdatesCommitmentAndCoordinatorSubmitsProof(
  epochManager,
  signer,
  coordinator,
  {
    tokenAllocations,
    salt,
    addressOfEpochAdmin,
    allocatingMemberIdx,
    numMembers,
  }
) {
  // update commitment
  const pubTokenAllocationHash = ethers.BigNumber.from(
    poseidonJs.F.toObject(poseidonJs([salt, ...tokenAllocations]))
  );
  const updateCommitmentTx = await epochManager
    .connect(signer)
    .updateTokenAllocationCommitment(
      addressOfEpochAdmin,
      pubTokenAllocationHash
    );
  await updateCommitmentTx.wait();

  // generate proof
  const { proofA, proofB, proofC, proofInput } = await generateProof({
    pubTokenAllocationHash: pubTokenAllocationHash.toBigInt(),
    allocatingMemberIdx,
    numMembers,
    tokenAllocations,
    salt,
  });

  // coordinator submits proof
  const submitProofTx = await epochManager
    .connect(coordinator)
    .submitTokenAllocationCommitmentProof(
      addressOfEpochAdmin,
      signer.address,
      proofA,
      proofB,
      proofC,
      proofInput
    );
  await submitProofTx.wait();
}

function unstringifyBigInts(o) {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    if (o === null) return null;
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

async function generateProof(input) {
  const { proof, publicSignals } = await groth16.fullProve(
    input,
    "circuits/zkeys/CheckTokenAllocations_15_test_js/CheckTokenAllocations_15_test.wasm",
    "circuits/zkeys/CheckTokenAllocations_15_test.final.zkey"
  );

  const editedPublicSignals = unstringifyBigInts(publicSignals);
  const editedProof = unstringifyBigInts(proof);
  const calldata = await groth16.exportSolidityCallData(
    editedProof,
    editedPublicSignals
  );

  const argv = calldata
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map((x) => BigInt(x).toString());

  const a = [argv[0], argv[1]];
  const b = [
    [argv[2], argv[3]],
    [argv[4], argv[5]],
  ];
  const c = [argv[6], argv[7]];
  const Input = argv.slice(8);

  return {
    proofA: a,
    proofB: b,
    proofC: c,
    proofInput: Input,
  };
}
