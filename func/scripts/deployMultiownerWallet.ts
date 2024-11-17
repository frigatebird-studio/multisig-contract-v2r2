import { Address, toNano } from '@ton/core';
import { Multisig } from '../wrappers/Multisig';
import { compile, NetworkProvider, UIProvider } from '@ton/blueprint';
import { blackholeAddress } from "./utils";

// MODIFY: we can easily change prompting to read from database or files anytime we want
async function userPrompt(ui: UIProvider): Promise<{
    threshold: number;
    signers: Address[];
    proposers: Address[];
    allowArbitrarySeqno: boolean;
}> {
    const threshold: number = Number(await ui.input('Enter multisig threshold (number only)'));
    const signers: Address[] = [];
    const proposers: Address[] = [];
    while (true) {
        const signer = await ui.inputAddress('Enter multisig signer address (leave empty to stop)', blackholeAddress);
        if (signer == blackholeAddress) break;
        signers.push(signer);
    }

    while (true) {
        const proposer = await ui.inputAddress('Enter multisig proposer address (leave empty to stop)', blackholeAddress);
        if (proposer == blackholeAddress) break;
        proposers.push(proposer);
    }

    const allowArbitrarySeqno: boolean = await ui.choose('Allow arbitrary seqno?', [true, false], (x) => x ? 'yes' : 'no');

    return { threshold, signers, proposers, allowArbitrarySeqno };
}

export async function run(provider: NetworkProvider) {
    const multisig_code = await compile('Multisig');

    const ui = provider.ui();

    // prompt user
    const params = await userPrompt(ui);

    // deploy multisig
    const multiownerWallet = provider.open(Multisig.createFromConfig(params, multisig_code));
    await multiownerWallet.sendDeploy(provider.sender(), toNano('0.002'));

    // wait for deployment
    await provider.waitForDeploy(multiownerWallet.address);
}
