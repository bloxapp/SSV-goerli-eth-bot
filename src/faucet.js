const Web3 = require("web3");
require('dotenv').config();
const axios = require("axios");
const { getContractToken, NETWORK_ABI } = require("./envHelper");
const {  SSV_EXPLORER_URL, SINGER_PRIVATE_KEY, SIGNER_OWNER_ADDRESS } = process.env;

const faucetApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet/`;
const faucetConfigApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet_config/`;

const createWeb3 = (ethProvider) => new Web3(new Web3.providers.HttpProvider(ethProvider));

const getTransactions = async () => {
    console.log('[FAUCET][INFO] Start fetching initiated transactions from Explorer Center')
    try {
        let response = (await axios.get(faucetApiUrl + '?status=initiated')).data;
        if(+response?.length === 0) console.log(`[FAUCET][INFO] No transaction to execute... starting over in 2 seconds`)
        for (let index = 0; index < response.length; index++) {
            const { network } = response[index];
            const networkData = getContractToken(network);
            const web3 = createWeb3(networkData.infura);
            const contract = new web3.eth.Contract(NETWORK_ABI[network], networkData.tokenAddress);
            const faucetConfig = await getFaucetConfig(network);
            console.log(`[FAUCET][INFO] faucet config: ${JSON.stringify(faucetConfig)}`);
            const faucetBalance = await getBalance(contract, SIGNER_OWNER_ADDRESS, web3);
            console.log(`[FAUCET][INFO] faucet balance: ${faucetBalance}`);
            const transactionsCapacity = Math.floor(faucetBalance / faucetConfig?.amount_to_transfer) - +response?.length;
            console.log(`[FAUCET][INFO] transactions capacity: ${transactionsCapacity}`);
            if(faucetConfig && faucetConfig.transactions_capacity !== transactionsCapacity) {
                console.log(`[FAUCET][INFO] update faucet config: ${transactionsCapacity}`);
                await updateFaucetConfig(faucetConfig, transactionsCapacity)
            }
            const userTransaction = response[index];
            if(!web3.utils.isAddress(userTransaction.owner_address)) {
                await updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, 'wrong owner_address', 'success')
                continue;
            }
            const nonce = '0x' + (await web3.eth.getTransactionCount(SIGNER_OWNER_ADDRESS)).toString(16);
            const data = contract.methods.transfer(userTransaction.owner_address, web3.utils.toWei(faucetConfig?.amount_to_transfer.toString())).encodeABI();
            const gasPrice = await getGasPrice(web3);
            const transaction = {
                data,
                nonce,
                chainID: network,
                gasLimit: 1000000,
                gasPrice: gasPrice,
                to: networkData.tokenAddress,
                from: SIGNER_OWNER_ADDRESS,
                value: web3.utils.numberToHex(web3.utils.toWei('0', 'ether')),
            }
            const signedTx = await web3.eth.accounts.signTransaction(transaction, SINGER_PRIVATE_KEY);
            console.log(`[FAUCET][INFO] Sending transaction for ${userTransaction.owner_address}`)
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                .on('transactionHash', (txHash) => {
                    updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, txHash, 'pending')
                })
                .on('receipt', (receipt) => {
                    console.log(`[FAUCET][INFO] Transaction for ${userTransaction.owner_address} finished with success`)
                    updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'success')
                })
                .on('error', (error) => {
                    console.log(`[FAUCET][INFO] Transaction for ${userTransaction.owner_address} finished with failure ${error.message}`)
                    updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'success')
                })
        }
        setTimeout(getTransactions, 2000);
    } catch (e) {
        console.log(`[FAUCET][ERROR]: ${e.message}`);
        console.log(`[FAUCET][ERROR]: Start fetching again....`);
        setTimeout(getTransactions, 2000);
    }
}

const getBalance = async (contract, walletAddress, web3) => {
    const result = await contract.methods.balanceOf(walletAddress).call();
    return web3.utils.fromWei(result);
}

const getFaucetConfig = async (network) => {
    let response = (await axios.get(faucetConfigApiUrl)).data.filter(config => config.network === network);
    if(response.length > 0) {
        return response[+response?.length - 1];
    } else {
        return null;
    }
}

const updateFaucetConfig = async (config, transactionsCapacity) => {
    (await axios.put(faucetConfigApiUrl + `${config.id}/`,{amount_to_transfer: config.amount_to_transfer, transactions_capacity: transactionsCapacity})).data;
}

const updateExplorerTransaction = async (transactionId, ownerAddress, txHash, status) => {
    const data = {
        owner_address: ownerAddress
    };
    if(status) data.status = status;
    if(txHash) data.tx_hash = txHash;
    return axios.put(faucetApiUrl + transactionId + "/", data);
};

const getGasPrice = async (web3) => {
    return await web3.eth.getGasPrice();
}

module.exports = {
    getTransactions,
};