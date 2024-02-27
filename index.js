require('dotenv').config();

const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { Secp256k1Keypair } = require('@mysten/sui.js/keypairs/secp256k1')
const { TransactionBlock } = require('@mysten/sui.js/transactions')

const BluemoveDex = '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9'
const SwapDexInfo = '0x3f2d9f724f4a1ce5e71676448dc452be9a6243dac9c5b975a588c8c867066e92'

const keypair = Secp256k1Keypair.fromSecretKey(process.env.PRIVATE_KEY)
const outputToken = '0x02::sui::SUI'
const inputToken = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'

const scenario = async(wallet, inputToken, outputToken, amount) => {
    const address = wallet.getPublicKey().toSuiAddress()
    const client  = new SuiClient({url: getFullnodeUrl(process.env.RPC_CHAIN)})
    console.log(address)

    const inputCoinMetadata = await client.getCoinMetadata({coinType: inputToken})
    const inputAmount = amount * (10**inputCoinMetadata.decimals)
    console.log(inputAmount)

    let coins = (await client.getCoins({owner: address, coinType: inputToken})).data
    if(coins.length==0) throw new Error('No token')
    let total = 0;
    for(let item of coins) total += Number(item.balance)
    if(total < inputAmount) throw new Error('Not Enough Token')
    const tx = new TransactionBlock()
    if(coins.length > 1)
        tx.mergeCoins(inputToken=='0x02::sui::SUI' ? tx.gas : tx.object(coins[0].coinObjectId), coins.slice(1, coins.length).map(item => {return tx.object(item.coinObjectId)}))
    const [coin] = tx.splitCoins(inputToken=='0x02::sui::SUI' ? tx.gas : tx.object(coins[0].coinObjectId), [tx.pure(inputAmount)])
    tx.moveCall({
        target: `${BluemoveDex}::router::swap_exact_input`,
        typeArguments:[
            inputToken,
            outputToken
        ],
        arguments:[
            tx.pure(inputAmount),
            coin,
            tx.pure(0),
            tx.object(SwapDexInfo)
        ]
    })
    const txResult = await client.signAndExecuteTransactionBlock({transactionBlock: tx, signer: wallet})
    console.log(txResult)
}

scenario(keypair, inputToken, outputToken, 0.1)

