import { Address, beginCell, Cell, internal, toNano } from "@ton/core"

export abstract class JettonOp {
    // to Wallet
    static readonly JettonTransfer = 0x0f8a7ea5
    static readonly JettonCallTo = 0x235caf52

    // to Jetton Wallet
    static readonly JettonInternalTransfer = 0x178d4519
    static readonly JettonNotify = 0x7362d09c
    static readonly JettonBurn = 0x595f07bc
    static readonly JettonBurnNotification = 0x7bdd97de
    static readonly JettonSetStatus = 0xeed236d3

    // to Jetton Master
    static readonly JettonMint = 0x642b7d07
    static readonly JettonChangeAdmin = 0x6501f354
    static readonly JettonClaimAdmin = 0xfb88e119
    static readonly JettonDropAdmin = 0x7431f221
    static readonly JettonChangeMetadata = 0xcb862902
    static readonly JettonUpgrade = 0x2508d66a
}

export abstract class NftOp {
    // to Wallet
    static readonly NftTransfer = 0x5fcc3d14
}

export const blackholeAddress = Address.parse('EQD__________________________________________0vo')

export const sleepMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function getJettonTransferMsg(jettonWalletAddress: Address, toAddress: Address, responseAddress: Address, jettonAmount: bigint, queryId: number = 0) {
    const body = beginCell()
        .storeUint(JettonOp.JettonTransfer, 32)       // jetton transfer op code
        .storeUint(queryId, 64)         // query_id:uint64
        .storeCoins(jettonAmount)       // amount:(VarUInteger 16) -  Jetton amount for transfer (decimals = 6 - USDT, 9 - default). Function toNano use decimals = 9 (remember it)
        .storeAddress(toAddress)        // destination:MsgAddress
        .storeAddress(responseAddress)  // response_destination:MsgAddress
        .storeUint(0, 1)                // custom_payload:(Maybe ^Cell)
        .storeCoins(1n)                 // forward_ton_amount:(VarUInteger 16) - if >0, will send notification message
        .storeUint(0, 1)                // forward_payload:(Either Cell ^Cell)
        .endCell();

    return internal({
        to: jettonWalletAddress,
        value: toNano("0.05"),
        body: body
    })
}

export function getTonTransferMsg(toAddress: Address, tonAmount: bigint, comment?: string) {
    return internal({
        to: toAddress,
        value: tonAmount,
        body: comment ? beginCell().storeUint(0, 32).storeStringTail(comment).endCell() : Cell.EMPTY
    })
}

export function getNftTransferMsg(nftItemAddress: Address, toAddress: Address, responseAddress: Address) {
    const body = beginCell()
        .storeUint(NftOp.NftTransfer, 32)   // NFT transfer op code 0x5fcc3d14
        .storeUint(0, 64)                   // query_id:uint64
        .storeAddress(toAddress)            // new_owner:MsgAddress
        .storeAddress(responseAddress)      // response_destination:MsgAddress
        .storeUint(0, 1)                    // custom_payload:(Maybe ^Cell)
        .storeCoins(1)                      // forward_amount:(VarUInteger 16) (1 nanoTon = toNano("0.000000001"))
        .storeUint(0, 1)                    // forward_payload:(Either Cell ^Cell)
        .endCell();

    return internal({
        to: nftItemAddress,
        value: toNano("0.05"),
        body: body
    })
}

export function getJettonBurnMsg(jettonWalletAddress: Address, responseAddress: Address, jettonAmount: bigint, queryId: number = 0) {
    const body = beginCell()
        .storeUint(JettonOp.JettonBurn, 32)     // jetton burn op code
        .storeUint(queryId, 64)                 // query_id:uint64
        .storeCoins(jettonAmount)               // amount:(VarUInteger 16) - Jetton amount in decimal (decimals = 6 - USDT, 9 - default). Function toNano use decimals = 9 (remember it)
        .storeAddress(responseAddress)          // response_destination:MsgAddress - owner's wallet
        .storeUint(0, 1)                        // custom_payload:(Maybe ^Cell) - w/o payload typically
        .endCell();

    return internal({
        to: jettonWalletAddress,
        value: toNano("0.05"),
        body: body
    })
}

export function getCustomizedAddresses() {
    const addresses: { [address: string]: Address } = {}
    if (process.env.DEPLOYER) {
        addresses.deployer = Address.parse(process.env.DEPLOYER)
    }
    if (process.env.SIGNER) {
        addresses.signerAddress = Address.parse(process.env.SIGNER)
    }
    if (process.env.PROPOSER) {
        addresses.proposerAddress = Address.parse(process.env.PROPOSER)
    }
    if (process.env.MULTISIG) {
        addresses.multisigAddress = Address.parse(process.env.MULTISIG)
    }
    if (process.env.SIGNER_JETTON_WALLET) {
        addresses.signerJettonWalletAddress = Address.parse(process.env.SIGNER_JETTON_WALLET)
    }
    if (process.env.PROPOSER_JETTON_WALLET) {
        addresses.proposerJettonWalletAddress = Address.parse(process.env.PROPOSER_JETTON_WALLET)
    }
    if (process.env.MULTISIG_JETTON_WALLET) {
        addresses.multisigJettonWalletAddress = Address.parse(process.env.MULTISIG_JETTON_WALLET)
    }
    if (process.env.NFT_ITEM) {
        addresses.nftItemAddress = Address.parse(process.env.NFT_ITEM)
    }
    return addresses
}