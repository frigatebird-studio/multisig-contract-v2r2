# multisig-contract-v2r2

## Introduction

This Multisig contract is inherited from: [multisig-contract-v2](https://github.com/frigatebird-studio/multisig-contract-v2).

We introduced some improvements to level up the whole signature process and enhance user experience for better safety and security.

## Progress

- [x] FunC version
- [ ] Tolk version

## Why we are proposing the Refinement?

### Ambiguity and Drawbacks

1. Changing configs may and may not make the previous Orders invalid if the change only manipulates the `threshold`.
1. Changing configs during actions iteration is an unsafe movement.
1. Signers can be duplicated, but approve-via-address only approves the first-found signer.
1. There are too many information for UI to process and handle. To improve UX, multisig services not only fetch data from blockchain but also highly rely on indexer api or private backend server.

### Whats New About V2R2?

1. Add a `updated_date` variable to Multisig and add a `created_date` variable to Order, so that all previous Orders since config change on Multisig become invalid, and we can now deploy different Multisig contract with same signers (due to different `updated_date`).
2. Skip all following actions if `update_config` action is executed to prevent uncertain behaviors from signer's perspective.
3. Remove the support for actions over 255 (no more `executed_internal`).
4. No more duplicated signers in Multisig.
5. Emit logs (external-message-out) for every event such as Multisig-Deployed, New-Order-Deployed, Order-Approved, Order-Executed, ... etc.
   
