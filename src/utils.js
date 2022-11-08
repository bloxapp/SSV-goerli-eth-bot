const Web3 = require('web3');
const {addLog} = require('./api.js');
const abiDecoder = require('abi-decoder');
const config = require('./config/config');
require('dotenv').config({path: '../.env'})
const bot = require("./initializers/DiscordBot");
const contractABI = require('../contract-abi.json');
const walletSwitcher = require('./initializers/WalletSwitcher');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.SSV_INFURA_HTTPS_ENDPOINT));

abiDecoder.addABI(contractABI);

// Validate faucet
const faucetIsReady = async (faucetAddress, amountRequested) => {
    const faucetBalance = await getAddressBalance(faucetAddress);
    console.log("Faucet Balance:", faucetBalance);
    const faucetBalanceNumber = Number(faucetBalance);
    const amountRequestedNumber = Number(amountRequested);
    return faucetBalanceNumber > amountRequestedNumber;
}

const convertToWei = async (amount) => {
    return web3.utils.toWei(amount, 'gwei');
};

// Eth
const getAddressTransactionCount = async (address) => {
    return await web3.eth.getTransactionCount(address);
}

const getAddressBalance = async (address) => {
    const balanceWei = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balanceWei);
}

// Math
const incrementHexNumber = (hex) => {
    const intNonce = parseInt(hex, 16);
    const intIncrementedNonce = parseInt(intNonce + 1, 10);
    return '0x' + intIncrementedNonce.toString(16);
}

const getNonce = async () => {
    const intNextNonceToUse = await getAddressTransactionCount(walletSwitcher.getWalletAddress());
    return '0x' + intNextNonceToUse.toString(16);
}

// Sending the goerli ETH
const sendGoerliEth = async (address, message, methodAbi, amount, nonce, latestGasPrice) => {
    console.log("Inside sendGoerliETH sending tx...")
    console.log('gasPrice:', latestGasPrice)

    const transaction = {
        nonce,
        chainID: 5,
        data: methodAbi,
        from: walletSwitcher.getWalletAddress(),
        to: '0xff50ed3d0ec03ac01d4c79aad74928bff48a7b2b',
        gasPrice:  web3.utils.toWei(latestGasPrice,'gwei'),
        value: web3.utils.numberToHex(web3.utils.toWei(amount.toString(), 'ether')),
    }

    try {
        const signedTx = await web3.eth.accounts.signTransaction(transaction, walletSwitcher.getWalletPrivateKey());
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        const publicKey = `0x${methodAbi.substring(330, 426)}`;
        console.log("Sent to " + message.authorId + " transaction receipt: ", receipt);
        await addLog(message, address, publicKey, methodAbi, receipt.transactionHash);
        if (message.authorId) {
            const channel = bot.channels.cache.find(channel => channel.id === config.CHANNEL_ID)
            if (channel) {
                channel.send(config.MESSAGES.SUCCESS.OPERATION_SUCCESSFUL(message.authorId, receipt.transactionHash))
            }
        }

    } catch (err) {
        if (err.message.includes('nonce too low')) {
            console.log('<<<<<<<<<<<<<<<<<<<<<<<<<calculate new nonce>>>>>>>>>>>>>>>>>>>>>>>>>');
            const newNone = await getNonce();
            await sendGoerliEth(address, message, methodAbi, amount, newNone, latestGasPrice);
        } else {
            console.log('<<<<<<<<<<error>>>>>>>>>>');
            console.log(err.message);
            const txHash = err?.receipt?.transactionHash;
            // await addLog(message, address, publicKey, methodAbi, txHash ?? 'none', true);
            if (message.authorId) {
                const channel = bot.channels.cache.find(channel => channel.id === config.CHANNEL_ID)
                if (channel) {
                    channel.send(config.MESSAGES.ERRORS.OPERATION_UNSUCCESSFUL(message.authorId, txHash))
                }
            }
        }
    }
}

module.exports = {
    getNonce,
    convertToWei,
    faucetIsReady,
    sendGoerliEth,
    getAddressBalance,
    incrementHexNumber,
    getAddressTransactionCount
};

