# Final Project: **Anonymous Coordinape**

Coordinape is a peer-based payroll management tool for DAOs. It features a Map functionality which allows anyone to visualize each contributor's public allocations of GIVE tokens towards the other contributors. This is rather sensitive information to many, and it would be nice if this can be kept private. Organizational peer-reviews make sense to be kept private - now, why aren't peer-based payroll allocations too?

With **Anonymous Coordinape**, Circle members submit their GIVE token allocations to the rest of the team **privately**. The only time when the GIVE tokens are made public is **after** each of the Circle members' private token allocations are aggregated.

Here is an example:

1. There exists a Circle with Alice, Bob and Charlie. Total GIVE tokens possible within Circle is 300 (100 GIVE tokens allocated to each member initially.)
2. Once an Epoch begins, Circle members submit their distributions privately:

   - Alice -> Bob: 30 GIVE
   - Alice -> Charlie: 70 GIVE
   - Bob -> Alice: 40 GIVE
   - Bob -> Charlie: 60 GIVE
   - Charlie -> Alice: 10 GIVE
   - Charlie -> Bob: 10 GIVE

3. Once the Epoch ends, the token distributions are aggregated, summed, and the following is made public:

   - Alice receives: 50 GIVE
   - Bob receives: 40 GIVE
   - Charlie receives: 130 GIVE

4. The GIVE tokens are automatically converted into GET tokens.
5. Each Circle member then proceeds to redeem USDC from GET tokens **within a claim window**.

Read the Competitive Landscape section below for more details on the Coordinape product.

# Functional Requirements

Here is the basic functionality for the MVP:

1. As an admin, I can create a Coordinape Circle.
2. As an admin of my Circle, I can add members to my Circle.
3. As an admin of my Circle, I can set the time window for a new Epoch.
4. As an admin of my Circle, all my Circle's members are automatically part of the new Epoch. (this is for simplicity - in the future we can add members to each Epoch)
5. As a member of a live Epoch, I am automatically given 100 GIVE tokens.
6. As a member of a live Epoch, I can submit my private distribution commitment along with a ZK proof.
7. As a member of an expired Epoch, I can publicly see the amount of GIVE / GET tokens I have been allocated by team members.
8. As a member of an expired Epoch, any of my GIVE tokens that are unallocated are burned.

# Out of Scope

**Anonymous Coordinape** develops a solution for anonymous token distributions (or voting, essentially). The following concepts are considered out of scope for this proof-of-concept.

## Anonymous Payroll

We do not explore how ZK technology can be used to preserve the privacy of wallets, how many funds are going into each address and identity (eg. which humans are connected to which wallets.)

# Proposal Overview

Here is an overview of the components that are needed to build this product:

1. ERC20 Smart Contract for GIVE
2. Web frontend
3. Circom circuit
4. Smart Contract for Contributor, Circle, GIVE token management.
5. Smart Contract for verifying ZK proofs.
6. Backend process(es)

In detail, this is how the system would work:

2. A web frontend would manage user interactions with the dApp as well as generating a zk-SNARK based proof that the user did submit a valid distribution of their GIVE tokens. At the same time, their private token distributions are sent over the network to a long-running process managed by the developers (ie. myself, hosted in some cloud provider).
3. An arithmetic circuit will need to be constructed to prove that users' private token allocation to the rest of the contributing team is valid without revealing it.
4. A smart contract is needed to manage the state of contributors, Circles, and trigger GIVE / GET token transfers and USDC redemption.
5. A smart contract is needed to verify ZK proofs.
6. A backend process is needed to calculate the final GIVE token distributions that will be revealed at the end of each Epoch, then committed on-chain for users to then convert into GET before redeeming into USDC.

Flow + Architecture diagram can be found in `diagrams` folder.

## Circuit Design

Here is the specification for the arithmetic circuit:

- **Private** inputs:
  - An array of integers representing the list of **all** Circle members, ordered lexicographically. The 0-th index will represent the number of tokens that are **not** allocated to any contributor.
  - Salt
- Checks / Constraints:
  - Each integer in the array is greater than 0.
  - Sum of integer array is equal to the total GIVE tokens to allocate, which is 10000 (to work nicely with basis points, or hundredths of a percentage)
- **Public** outputs:
  - Hash of the integer array along with a salt.

A salt is needed to prevent brute-force attacks. In most cases, Coordinape Circles will be small (as they should be) which reduces the search space for an attacker to find out a pre-image corresponding to the hash that is committed onto the public smart contract. A privately generated salt will drastically increase the search space to make it programmatically and statistically impossible for an attacker to find a collision.

Please check `poc_circuit.circom` in this directory for a POC for what the arithmetic circuit might look like. (incomplete due to lack of time)

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
  - The aspect of Coordinape that we're improving with Anonymous Coordinape can be seen as a form of ZK voting, and Semaphore has been used for several voting applications previously. To recap, Semaphore is great for 1) basic membership validity checks and 2) enforcing one-time signals per each external nullifier. In our case, it wouldn't make sense to hide the public keys that are associated with a Circle (as it is trivial to trace who redeemed USDC with GET tokens anyways), and we should allow users to send as many updates to their token allocation commitments as they wish while the Epoch is still live.
- Why does this need to be on the blockchain / use smart contract anyways if centralized actors have full knowledge of everyone's token distributions anyway?
  - The implementation behind this MVP can be seen as a first step before we adopt homomorphic encryption techniques to **remove dependence on centralized actors (and anyone else ever seeing the private token allocations)** down the line. This is a known **next step**.

# Open Questions

The following questions will be answered in the future:

- How can we strip more scope off of this MVP?
- Can any component be designed to be re-usable?
- Can we consider making the admin's budget per Epoch private too? That way, contributors detach from the actual monetary amount when giving out GIVE tokens.
- This current proposal faces the same problem of relying on centralized actors for processing blind auctions and sending funds to the actual winner in [ZK Blind Auction](https://github.com/heivenn/zk-blind-auction). Would it be possible to adopt Homomorphic Encryption techniques to avoid the need for centralized actors altogether?
