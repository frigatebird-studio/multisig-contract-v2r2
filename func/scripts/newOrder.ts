import { Address, SendMode, toNano } from '@ton/core';
import { Multisig, TransferRequest, UpdateRequest } from '../wrappers/Multisig';
import { NetworkProvider, UIProvider } from '@ton/blueprint';
import { getJettonTransferMsg, getTonTransferMsg, sleepMs, getCustomizedAddresses, getNftTransferMsg, getJettonBurnMsg } from "./utils";

// MODIFY: we can easily change prompting to read from database or files anytime we want
async function userPrompt(ui: UIProvider): Promise<{
    multisigAddress: Address,
    expireAfterSeconds: number,
    proposerInfo: {
        isSigner: boolean,
        index: number,
    },
    orderSeqno: bigint
}> {
    const multisigAddress = await ui.inputAddress('Enter multisig address');
    const expireAfterSeconds = Number(await ui.input('Enter expiration date in seconds (number only)'));
    const isSigner: boolean = await ui.choose('Is proposer signer?', [true, false], (x) => x ? 'yes' : 'no');
    const index = Number(await ui.input('Enter proposer address book index (number only)'));
    const orderSeqno = BigInt(await ui.input('Enter order seqno (number only)'));

    return { multisigAddress, expireAfterSeconds, proposerInfo: { isSigner, index }, orderSeqno };
}

export async function run(provider: NetworkProvider) {
    // prompt user
    const ui = provider.ui()
    const params = await userPrompt(ui);

    // multisig should be deployed
    const _multisig = provider.open(new Multisig(params.multisigAddress));
    const { nextOrderSeqno, threshold, signers, proposers } = await _multisig.getMultisigData();
    const multisig = new Multisig(params.multisigAddress, undefined, {
        threshold: Number(threshold),
        signers,
        proposers,
        allowArbitrarySeqno: nextOrderSeqno === -1n ? true : false
    });
    multisig.orderSeqno = nextOrderSeqno;
    const multiownerWallet = provider.open(multisig);

    console.log(`multisig contract config: ${JSON.stringify({
        nextOrderSeqno: Number(nextOrderSeqno),
        threshold: Number(threshold),
        signers: signers.map(a => a.toString()),
        proposers: proposers.map(a => a.toString()),
    }, null, 2)}`);

    // MODIFY: change or add any actions here
    const { proposerAddress: randomPeopleAddress, multisigJettonWalletAddress, nftItemAddress } = getCustomizedAddresses() // TODO: bad practice, for POC purposes
    // action: ton transfer (3 ton)
    const tonReceiver = Address.parse("EQB2r-SUonB6OoINCyfk9lo4mxaoFg7Tb_bBIZGEthaIoPMU")//randomPeopleAddress
    const actionTonTransferPayload: TransferRequest = {
        type: 'transfer',
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        message: getTonTransferMsg(tonReceiver, 1n)
    }
    /*
    MS: EQBUYrkxlftlmafG6j2fgmWJM-rtxO6DC5knteeZa_7tJtsE
    OD: 

    // action: update configurations (remove all proposers)
    const actionConfigUpdatePayload: UpdateRequest = {
        type: 'update',
        threshold: Number(threshold),
        signers: [...signers],
        proposers: [],
    }
    // action: jetton transfer (10 jettons)
    const jettonReceiver = randomPeopleAddress
    const senderJettonWallet = multisigJettonWalletAddress
    const jettonTransferNotificationReceiver = params.multisigAddress
    const jettonTransferAmount = 1000000000000000000n
    const actionJettonTransferPayload: TransferRequest = {
        type: 'transfer',
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        message: getJettonTransferMsg(senderJettonWallet, jettonReceiver, jettonTransferNotificationReceiver, jettonTransferAmount)
    }
    // action: nft transfer
    const nftReceiver = randomPeopleAddress
    const nftItem = nftItemAddress
    const nftTransferNotificationReceiver = params.multisigAddress
    const actionNftTransferPayload: TransferRequest = {
        type: 'transfer',
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        message: getNftTransferMsg(nftItem, nftReceiver, nftTransferNotificationReceiver)
    }
    // action: jetton burn
    const burnerJettonWallet = multisigJettonWalletAddress
    const burnNotificationReceiver = params.multisigAddress
    const jettonBurnAmount = 1000000000000000000n
    const actionJettonBurnPayload: TransferRequest = {
        type: 'transfer',
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        message: getJettonBurnMsg(burnerJettonWallet, burnNotificationReceiver, jettonBurnAmount)
    }
    */

    // create new order
    await multiownerWallet.sendNewOrder(provider.sender(),
        [actionTonTransferPayload], // or [actionConfigUpdatePayload, actionJettonTransferPayload, ...]
        Math.floor(Date.now() / 1000 + params.expireAfterSeconds), // expire time
        toNano('0.1'), // ton amount
        params.proposerInfo.index, // index
        params.proposerInfo.isSigner, // not signer
        params.orderSeqno // order_seqno
    );

    // wait for deployment
    let orderAddress = null;
    while (!orderAddress) {
        await sleepMs(1000);
        try {
            orderAddress = await multiownerWallet.getOrderAddress(params.orderSeqno)
            console.log("Order address:", orderAddress);
        } catch (e) {
            await sleepMs(3000);
        }
    }
}
