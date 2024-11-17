import { Address, beginCell, Cell } from '@ton/core';
import { compile, NetworkProvider, UIProvider } from '@ton/blueprint';
import { sleepMs } from "./utils";
import { Order } from '../wrappers/Order';

// MODIFY: we can easily change prompting to read from database or files anytime we want
async function userPrompt(ui: UIProvider): Promise<{
    multisigAddress: Address,
    orderSeqno: number,
    signerIndex: number,
}> {
    const multisigAddress = await ui.inputAddress('Enter MultiSig address');
    const orderSeqno = Number(await ui.input('Enter order seqno (number only)'));
    const signerIndex = Number(await ui.input('Enter signer address book index (number only)'));

    return { multisigAddress, orderSeqno, signerIndex };
}

export async function run(provider: NetworkProvider) {
    // prompt user
    const ui = provider.ui()
    const params = await userPrompt(ui);

    // multisig should be deployed
    const orderCodeRaw = await compile('Order');
    const libPrep = beginCell().storeUint(2, 8).storeBuffer(orderCodeRaw.hash()).endCell();
    const orderCode = new Cell({ exotic: true, bits: libPrep.bits, refs: libPrep.refs });
    const orderInstance = Order.createFromConfig({
        multisig: params.multisigAddress,
        orderSeqno: params.orderSeqno
    }, orderCode);
    const order = provider.open(orderInstance);

    // send order approval
    await order.sendApprove(provider.sender(), params.signerIndex);

    // wait for success
    let executed = false
    let attemps = 10
    while (!executed) {
        await sleepMs(1000);
        attemps--;
        if (attemps == 0) break;
        try {
            executed = (await order.getOrderData()).executed ?? false;
        }
        catch (e) {
            await sleepMs(3000);;
        }
    }
    if (executed) {
        console.log("Order has been executed");
    } else {
        console.log("Order hasn't been executed");
    }
}
