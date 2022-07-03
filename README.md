# Final Project: **Anonymous Coordinape**

Frontend Repo: https://github.com/hwrdtm/zku-cohort-3-final-project-frontend

Coordinape is a peer-based payroll management tool for DAOs. It features a Map functionality which allows anyone to visualize each contributor's public allocations of GIVE tokens towards the other contributors. This is rather sensitive information to many, and it would be nice if this can be kept private. Organizational peer-reviews make sense to be kept private - now, why aren't peer-based payroll allocations too?

With **Anonymous Coordinape**, Epoch members submit their GIVE token allocations to the rest of the team **privately**. The only time when the GIVE tokens are made public is **after** each of the Epoch members' private token allocations are aggregated.

Here is an example:

1. There exists a Epoch with Alice, Bob and Charlie. Total GIVE tokens possible within Epoch is 30000 (10000 GIVE tokens allocated to each member initially.)
2. Once an Epoch begins, Epoch members submit their distributions privately:

   - Alice -> Bob: 3000 GIVE
   - Alice -> Charlie: 7000 GIVE
   - Bob -> Alice: 4000 GIVE
   - Bob -> Charlie: 6000 GIVE
   - Charlie -> Alice: 1000 GIVE
   - Charlie -> Bob: 1000 GIVE

3. Once the Epoch ends, the token distributions are aggregated, summed, and the following is made public:

   - Alice receives: 5000 GIVE
   - Bob receives: 4000 GIVE
   - Charlie receives: 13000 GIVE

4. Each Epoch member then proceeds to redeem the reward with their GIVE token allocations **within a claim window**.

Read the Competitive Landscape section below for more details on the original Coordinape product.

# Why Are Zero-Knowledge Proofs Necessary?

Zero-Knowledge Proofs enable provers to prove the validity of their private commitments without revealing in plaintext any details about the private commitment pre-image. This is exactly the kind of technology that can enable Anonymous Coordinape to function as intended.

# Glossary

Admin

- The creator of an Epoch.

Member

- A participant of an Epoch.

Finished Epoch

- An Epoch that is no longer accepting commitment or commitment proof submissions, and can only be overwritten by a newly scheduled Epoch, or have token allocations be revealed to reach Finalized state.

Finalized Epoch

- An Epoch that has revealed the tokens allocated to each member and can only be overwritten by a newly scheduled Epoch.

# Functional Requirements

The objective of the MVP is to demonstrate the usage of zero-knowledge proofs towards an application use-case similar to Coordinape's. Therefore, here is the minimal viable feature set for the MVP:

1. As an admin, I can schedule an Epoch which begins in the future.
2. As a member of an active Epoch, I can submit my private token allocation commitment, which is then proved by the dedicated coordinator.
3. As a coordinator of an active Epoch, I can submit a proof of a member's token allocation commitment in order to mark it as verified.
4. As a coordinator of a finished Epoch, I can submit the revealed token allocations per each member.
5. As a member of a Finalized Epoch, I can collect the rewards for that Epoch which is proportional to the number of tokens that have been allocated to myself.

# Out of Scope

**Anonymous Coordinape** develops a solution for anonymous token distributions (or voting, essentially). The following concepts are considered out of scope for this proof-of-concept.

## Anonymous Payroll

We do not explore how ZK technology can be used to preserve the privacy of wallets, how many funds are going into each address and identity (eg. which humans are connected to which wallets.)

# Proposal Overview

## Design Decisions

Before going through what needs to be built, we begin with the list of design decisions that are made, some for simplicity, some for working with technical constraints, some for avoiding members "cheating" the system:

- For simplicity, users interact directly with Epochs, instead of having to create Circles as an additional grouping mechanism on top.
- For simplicity, any wallet address can only maintain the state of 1 Epoch. This means that the state of old Epochs that get overwritten is not maintained.
- For simplicity, all Epochs must use the API's dedicated coordinator.
- All Epochs must have between 2 and 15 members.

  - The upper limit is a technical constraint. While less than 2 members is meaningless, more than 15 members means cannot use Poseidon hashing function in the arithmetic circuit to generate a proof. Besides, the larger the Epoch group the poorer your understanding of your teammates' output during that Epoch, and it becomes harder to decide on the number of tokens to allocate to the other Epoch members.

- Any member must not be able to allocate any tokens privately to themselves at all.

  - Private token allocations encourage members to allocate tokens to themselves. In an effort to avoid this form of "cheating", we make it impossible for members to allocate any tokens to themselves. This means that, a special case is when there are only 2 members in an Epoch and they can only allocate all 10000 tokens to each other - the reward budgeted for this Epoch is split in half between members. For this reason, Epoch groups are encouraged to be a little larger than 2 members - indeed, at a size of 3 there can already be token allocations that are more interesting and meaningful.

- For integrity & security, all commitments submitted by Epoch members must be verified by the coordinator by submitting a proof corresponding to their commitment. Unverified member commitments will prevent the Epoch from being finalized.

- Without this two-step verification process, Epoch members can submit a commitment on-chain but send completely different private token allocations to the centralized backend. Therefore, by having the member send all relevant commitment parameters to the backend and then the backend generates and submits a proof, we can guarantee that the backend at least has knowledge of the private parameters for that Epoch member. The final trust assumption is that the backend does not tamper with the private token allocations during aggregation when revealing.

## Overall Components

With that, here is an overview of the components that are needed to build this product:

1. Web frontend
2. Backend ("process")
3. Circom circuit
4. Smart Contract for managing Epochs.
5. Smart Contract for verifying ZK proofs.

In detail, this is how the system would work:

1. A web frontend would manage user interactions with the dApp as well as generating a zk-SNARK based proof that the user did submit a valid distribution of their tokens. At the same time, their private token distributions are sent to a centralized backend (managed by the developers).
2. An arithmetic circuit will need to be constructed to prove that users' private token allocation to the rest of the contributing team is valid without revealing it.
3. A smart contract is needed to manage the state of contributors, Epoch, and trigger GIVE / GET token transfers and USDC redemption.
4. A smart contract is needed to verify ZK proofs.
5. A backend process is needed to calculate the final token allocations that will be revealed at the end of each Epoch, then committed on-chain for users to then collect their rewards.

Flow + Architecture diagram can be found in `diagrams` folder.

## Circuit Design

Here is the specification for the arithmetic circuit:

- **Public** inputs:
  - The commitment made on-chain by an Epoch member.
  - The index of the Epoch member that is attempting to generate a proof for their private token allocation.
  - The number of members in the Epoch.
- **Private** inputs:
  - An array of integers representing the list of **all** Epoch members, ordered lexicographically. The 0-th index will represent the number of tokens that are **not** allocated to any contributor.
  - Salt
- Checks / Constraints:
  - Token allocation only contains positive integers.
  - Number of members is between 0 and 15.
  - Index of the allocating Epoch member must be between 0 and the number of members - 1.
  - Token allocation does not contain non-zero integer at the index of the allocating Epoch member.
  - Token allocation does not contain non-zero integer at any index greater than the number of members.
  - Token allocation contains integers whose sum is equal to 10000 (to work nicely with basis points, or hundredths of a percentage)
- **Public** outputs:
  - Hash of the integer array along with a salt.

A salt is needed to prevent brute-force attacks. In most cases, Coordinape Epochs will be small (as they should be) which reduces the search space for an attacker to find out a pre-image corresponding to the hash that is committed onto the public smart contract. A privately generated salt will drastically increase the search space to make it programmatically and statistically impossible for an attacker to find a collision.

### One Circuit, Multiple Membership Sizes

Given that the private integer array input for token allocations needs to be a fixed size array at compile-time, one approach to accommodate for various Epoch membership sizes is to compile the `CheckTokenAllocations.circom` circuit for each of the membership size from 2 through to 15. Not only would this add a great deal of complexity, it would also drastically increase the storage and download requirements every time users browsed our application (due to the `.zkey` proof generation files). This is suboptimal.

Instead, we can compile the circuit once with `n = 15`, and use public inputs in a way to accommodate for various Epoch membership sizes while providing guarantees that tokens aren't allocated to non-existent members etc. Extra verification is made at the contract level to ensure the correct public inputs are used.

# Use Cases

Anonymous Coordinape can be used just like Coordinape in any organizational process where a set of contributors need to be compensated, **with the additional benefit that token allocations are kept private, but provably valid**.

# Competitive Landscape

In this section we explore some competitor products and compare the advantages / disadvantages Anonymous Coordinape has

## Competitor #1: Coordinape

Coordinape is a peer-based payroll management tool for DAOs. Traditionally, a top-down approach is often used to assess the quality of DAO member contributions, which is time-consuming as higher level "managers" will need to spend time to switch into the contexts of the implementers. What is worse is that they may spend the time and end up with an assessment of the quality **that is misaligned with other team members** - think about the time when your manager is not aware of certain contributions you make to your wider team. This misalignment is exacerbated with more levels of hierarchy as generally seen in larger organizations.

Much like how companies have peer-reviews that help drive promotion / salary-raise / code-merge processes, Coordinape presents an alternative to payroll management where a bottom-up approach is used to identify where the most value and impact originated from.

Main flow:

- Admins create a Circle and add contributors to this Circle. A Circle is simply a collection of members most intuitively grouped by specialization - for example, there can be a Development Circle grouping all the software developers together.
- Admins create a new Epoch. An Epoch is simply a certain time period, and can be mapped to a SCRUM-style sprint, for those who are familiar. Each contributing member provides a description per Epoch describing what they've been working on during the current Epoch.
- Once an Epoch begins, each contributor receives a fixed amount of GIVE tokens (eg. capped at 100) and can decide for themselves how to distribute these GIVE tokens to the rest of the contributing team members.
- Once an Epoch ends, each contributor's GIVE tokens are converted into GET tokens, which are redeemable for USDC. Any uspent GIVE tokens are burnt.

Here's an example (courtesy of [this](https://www.daomasters.xyz/tools/coordinape#:~:text=How%20does%20it%20work%3F,by%20specialization%2C%20e.g.%20development.)):

- Sophie receives 50 GIVE tokens from the community for her contributions.
- At the end of the Epoch, her GIVE tokens are automatically converted to GET tokens.
- The total allocation across the whole DAO during this Epoch is 1,000 GET tokens.
- The DAO decides that their total budget for this Epoch is 25,000 USDC.
- Sophie’s 50 GET Tokens are 5% of the available 1,000 GET tokens, so she is sent 5% of the DAO’s total budget (1,250 USDC.)

References:

- [How does it work](https://www.daomasters.xyz/tools/coordinape#:~:text=How%20does%20it%20work%3F,by%20specialization%2C%20e.g.%20development.)
- [Demo](https://www.youtube.com/watch?v=J8oGun8EKDE)

## Competitor #2: Utopia

Utopia is a payroll management tool for DAOs.

Main flows:

- Admins add recipients to be paid.
- Create one-off payment requests.
- Create recurring payments requests
- Batch payment requests into single transactions.
- Gasless transactions (after number of Admin signatures > multisig threshold)

## Comparison

Comparing Anonymous Coordinape with Utopia is much like comparing Coordinape with Utopia - much of it is [covered here anyways](https://www.daomasters.xyz/tools/coordinape#:~:text=How%20does%20it%20work%3F,by%20specialization%2C%20e.g.%20development.).

The more interesting comparisons are between Anonymous Coordinape and the original Coordinape:

- Advantages:
  - Privatised peer-review, effectively. As a contributor, you know how your peers view you overall, but you can't reverse engineer to the extent which contributor decided to pay you how much.
  - More aspects of the overall UX are placed on-chain.
  - No need to actually maintain GIVE token balances since operating with 10000 tokens that work as basis points.
- Disadvantages:
  - Complicated product means harder to maintain software, debug problems.
  - As more aspects are moved on-chain, this will lead to worse UX as users may have to sign more messages (not necessary pay more out of pocket)
  - Reliance on centralized actor (though there are active plans to move away from them, this is just for MVP.)

# Proposal Ask

Anonymous Coordinape will become community-driven and self-funded by its own DAO. In order to get this up and running, I am requesting the $15k/year stable basic income to take care of initial development, welfare, and operations costs. This is based on the [5 milestones introduced via the zkDAO Launch Grant Program](https://talk.harmony.one/t/about-the-zkdao-category/13475).

# Roadmap

| Milestone | Date       | Deliverable(s)                         |
| --------- | ---------- | -------------------------------------- |
| 1         | Wed Jun 8  | Architecture diagram, flow diagram     |
| 2         | Tue Jun 14 | Circom circuit                         |
| 3         | Thu Jun 16 | Smart contracts                        |
| 4         | Sun Jun 19 | Backend process                        |
| 5         | Wed Jun 23 | Web frontend, overall code completion. |

Aim for code complete by June 23. QA from June 23-27.

# FAQ

- Why are we not building this on top of Semaphore?
  - The aspect of Coordinape that we're improving with Anonymous Coordinape can be seen as a form of ZK voting, and Semaphore has been used for several voting applications previously. To recap, Semaphore is great for 1) basic membership validity checks and 2) enforcing one-time signals per each external nullifier. In our case, it wouldn't make sense to hide the public keys that are associated with a Epoch (as it is trivial to trace who redeemed USDC with GET tokens anyways), and we should allow users to send as many updates to their token allocation commitments as they wish while the Epoch is still live.
- Why are we not building this on top of MACI?

  - Though the needs of Anonymous Coordinape are quite similar to that of MACI's, MACI is built for the quadratic voting use case, and Anonymous Coordinape isn't quite "voting" related but more simply about distributing tokens. MACI does not contain a trivial amount of code and changing MACI components to fit the needs of Anonymous Coordinape required too much work, hence it was decided to write from scratch as a faster path to finishing the MVP. For example, MACI's circuits would need to be changed to fit the use case of token allocations instead of quadratic voting. Then, the signup function would have to be changed to be admin-based, which also manages Epochs.
  - That said, MACI provides a number of relevant guarantees that Anonymous Coordinape can certainly benefit from. The first is anti-collusion - it would be helpful for Epoch members to perform bribe-resitant actions. Then, MACI allows reducing trust assumptions on centralized processes, by preventing the centralized coordinator from tampering with the Epoch. For these reason, the next version of Anonymous Coordinape can look to incorporate more elements of MACI. For those who are interested, here are the next steps for making Anonymous Coordinape tamper-proof:
    - Similar to MACI, use (Incremental) Merkle Trees with leaves being the hashes of each Epoch Member's token allocation commitment.
    - Introduce another circuit to have backend process enter the private token allocations + salts, check that the merkle tree root hash is maintained the same as the one on-chain (which is updated each time Epoch Member submits commitment), and then output an array corresponding to the final, revealed token allocations per each Epoch Member.

- Why does this need to be on the blockchain / use smart contract anyways if centralized actors have full knowledge of everyone's token distributions anyway?
  - The implementation behind this MVP can be seen as a first step before we adopt homomorphic encryption techniques to **remove dependence on centralized actors (and anyone else ever seeing the private token allocations)** down the line. This is a known **next step**.
- Why are getter functions like `getEpochMembers` written when the `adminEpochs` mapping is `public`?

  - See [related thread](https://github.com/ethereum/solidity/issues/12792). Even though the `Epoch` struct can be retrieved publicly by default, its inner array fields are not returned. Hence, it is necessary to implement getter functions for those fields manually.

# Open Questions

The following questions will be answered in the future:

- Can any component be designed to be re-usable?
- Can we consider making the admin's budget per Epoch private too? That way, contributors detach from the actual monetary amount when giving out GIVE tokens.
- This current proposal faces the same problem of relying on centralized actors for processing blind auctions and sending funds to the actual winner in [ZK Blind Auction](https://github.com/heivenn/zk-blind-auction). Would it be possible to adopt Homomorphic Encryption techniques to avoid the need for centralized actors altogether?
