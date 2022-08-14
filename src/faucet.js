const Web3 = require("web3");
const Contract = require('web3-eth-contract');
require('dotenv').config();
const axios = require("axios");
const jsonInterface = require('../src/abi.json');
const { SSV_INFURA_HTTPS_ENDPOINT, SSV_EXPLORER_URL } = process.env;
const web3 = new Web3(new Web3.providers.HttpProvider(SSV_INFURA_HTTPS_ENDPOINT));

const ssvContract = '0x6471F70b932390f527c6403773D082A0Db8e8A9F';
const contract = new Contract(jsonInterface, ssvContract);
const faucetApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet/`;
const signerOwnerAddress = '0x67Ce5c69260bd819B4e0AD13f4b873074D479811';
const signerPrivateKey = '8dbeb43e76b53cecbd8868a058bb33b152af72526142eee0ea656b0bb0473f70';

export const getTransactions = async () => {
    console.log('Start fetching initiated transactions from Explorer Center')
    let response = (await axios.get(faucetApiUrl + '?status=initiated')).data;
    console.log(`Fetched ${+response?.length}`)
    if(+response?.length === 0) console.log(`No transaction to execute... starting over in 2 seconds`)
    for (let index = 0; index < response.length; index++) {
        const userTransaction = response[index];
        const nonce = '0x' + (await web3.eth.getTransactionCount(signerOwnerAddress)).toString(16);
        const data = contract.methods.transfer(userTransaction.owner_address, web3.utils.toWei('10')).encodeABI();
        const gasPrice = 990000000000;
        const transaction = {
            data,
            nonce,
            chainID: 5,
            gas: 1000000,
            gasPrice: gasPrice,
            to: ssvContract,
            from: signerOwnerAddress,
            value: web3.utils.numberToHex(web3.utils.toWei('0', 'ether')),
        }
        const signedTx = await web3.eth.accounts.signTransaction(transaction, signerPrivateKey);
        console.log(`Sending transaction for ${userTransaction.owner_address}`)
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', (txHash) => {
                updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, txHash, 'pending')
            })
            .on('receipt', (receipt) => {
                console.log(`Transaction for ${userTransaction.owner_address} finished with success`)
                updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'success')
            })
    }
    setTimeout(getTransactions, 2000);
}

const updateExplorerTransaction = async (transactionId, ownerAddress, txHash, status) => {
    const data = {
        owner_address: ownerAddress
    };
    if(status) data.status = status;
    if(txHash) data.tx_hash = txHash;
    return axios.put(faucetApiUrl + transactionId + "/", data);
};