const Web3 = require("web3");
require('dotenv').config();
const axios = require("axios");
const jsonInterface = require('../src/abi.json');
const { SSV_INFURA_HTTPS_ENDPOINT, SSV_EXPLORER_URL, SINGER_PRIVATE_KEY, SIGNER_OWNER_ADDRESS, SSV_CONTRACT_ADDRESS } = process.env;
const web3 = new Web3(new Web3.providers.HttpProvider(SSV_INFURA_HTTPS_ENDPOINT));

const faucetApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet/`;
const faucetConfigApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet_config/`;
const contract = new web3.eth.Contract(jsonInterface, SSV_CONTRACT_ADDRESS);

const getTransactions = async () => {
    console.log('Start fetching initiated transactions from Explorer Center')
    try {
        const faucetConfig = await getFaucetConfig();
        const faucetBalance = await getBalance(contract, SIGNER_OWNER_ADDRESS);
        let response = (await axios.get(faucetApiUrl + '?status=initiated')).data;
        const transactionsCapacity = Math.floor(faucetBalance / faucetConfig?.amount_to_transfer) - +response?.length;
        if(faucetConfig.transactions_capacity !== transactionsCapacity) await updateFaucetConfig(faucetConfig, transactionsCapacity)
        if(+response?.length === 0) console.log(`No transaction to execute... starting over in 2 seconds`)
        for (let index = 0; index < response.length; index++) {
            const userTransaction = response[index];
            const nonce = '0x' + (await web3.eth.getTransactionCount(SIGNER_OWNER_ADDRESS)).toString(16);
            const data = contract.methods.transfer(userTransaction.owner_address, web3.utils.toWei(faucetConfig?.amount_to_transfer.toString())).encodeABI();
            const gasPrice = await getGasPrice();
            const transaction = {
                data,
                nonce,
                chainID: 5,
                gasLimit: 1000000,
                gasPrice: gasPrice,
                to: SSV_CONTRACT_ADDRESS,
                from: SIGNER_OWNER_ADDRESS,
                value: web3.utils.numberToHex(web3.utils.toWei('0', 'ether')),
            }
            const signedTx = await web3.eth.accounts.signTransaction(transaction, SINGER_PRIVATE_KEY);
            console.log(`Sending transaction for ${userTransaction.owner_address}`)
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                .on('transactionHash', (txHash) => {
                    updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, txHash, 'pending')
                })
                .on('receipt', (receipt) => {
                    console.log(`Transaction for ${userTransaction.owner_address} finished with success`)
                    updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'success')
                })
                .on('error', (error) => {
                    console.log(`Transaction for ${userTransaction.owner_address} finished with failure ${error.message}`)
                    updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'initiated')
                })
        }
        setTimeout(getTransactions, 2000);
    } catch (e) {
        console.log(`[FAUCET][ERROR]: ${e.message}`);
        console.log(`[FAUCET][ERROR]: Start fetching again....`);
        setTimeout(getTransactions, 2000);
    }
}

const getBalance = async (contract, walletAddress) => {
    const result = await contract.methods.balanceOf(walletAddress).call();
    return web3.utils.fromWei(result);
}

const getFaucetConfig = async () => {
    let response = (await axios.get(faucetConfigApiUrl)).data;
    return response[+response?.length - 1];
}

const updateFaucetConfig = async (config, transactionsCapacity) => {
    (await axios.put(faucetConfigApiUrl + `${config.id}/`,{amount_to_transfer: config.amount_to_transfer,transactions_capacity: transactionsCapacity})).data;
}

const updateExplorerTransaction = async (transactionId, ownerAddress, txHash, status) => {
    const data = {
        owner_address: ownerAddress
    };
    if(status) data.status = status;
    if(txHash) data.tx_hash = txHash;
    return axios.put(faucetApiUrl + transactionId + "/", data);
};

const getGasPrice = async () => {
    return await web3.eth.getGasPrice();
}

module.exports = {
    getTransactions,
};