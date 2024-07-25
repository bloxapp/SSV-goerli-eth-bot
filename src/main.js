import { ethers, utils } from 'ethers';
import dotenv from 'dotenv';
import axios from 'axios';
import axiosRetry from 'axios-retry';

dotenv.config();

axiosRetry(axios, {
    retries: 3,
    retryDelay: (...arg) => axiosRetry.exponentialDelay(...arg, 1000),
    retryCondition(error) {
        switch (error.response.status) {
            //retry only if status is 500 or 501
            case 500:
            case 501:
                return true;
            default:
                return false;
        }
    },
    onRetry: (retryCount, error, requestConfig) => {
        console.log(`[FAUCET][ERROR]: error: ${error}, url ${requestConfig.url}, retry count: ${retryCount}`);
    }
});

import { getContractToken, NETWORK_ABI } from './envHelper.js';
const {  SSV_EXPLORER_URL, SINGER_PRIVATE_KEY, SIGNER_OWNER_ADDRESS } = process.env;

const faucetApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet/`;
const faucetConfigApiUrl = `${SSV_EXPLORER_URL}/api/ssv_faucet_config/`;

const runFaucetBot = async () => {
    console.log('[FAUCET][INFO] Start fetching initiated transactions from Explorer Center')
    try {
        let response = (await axios.get(faucetApiUrl + '?status=initiated')).data;
        if (!response) {
            console.log('[FAUCET][ERROR]: no data returned from ExplorerCenter');
        } else if (response?.length === 0) {
            console.log(`[FAUCET][INFO] No transaction to execute... starting over in 2 seconds`);
        } else {
            for (let index = 0; index < response.length; index++) {
                const { network } = response[index];
                const networkData = getContractToken(network);
                const provider = new ethers.providers.JsonRpcProvider(networkData.infura);
                const wallet = new ethers.Wallet(SINGER_PRIVATE_KEY, provider);
                const tokenContract = new ethers.Contract(networkData.tokenAddress, NETWORK_ABI[network], wallet);

                const faucetConfig = await getFaucetConfig(network);
                if (!faucetConfig) {
                    console.error('[FAUCET][ERROR] failed to get faucet config')
                    continue;
                }
                console.log(`[FAUCET][INFO] faucet config: ${JSON.stringify(faucetConfig)}`);

                const faucetBalance = utils.formatEther(await tokenContract.balanceOf(SIGNER_OWNER_ADDRESS));
                console.log(`[FAUCET][INFO] faucet balance: ${faucetBalance}`);
                const transactionsCapacity = Math.floor(faucetBalance / faucetConfig?.amount_to_transfer) - 1;
                console.log(`[FAUCET][INFO] transactions capacity: ${transactionsCapacity}`);

                if (faucetConfig && faucetConfig.transactions_capacity !== transactionsCapacity) {
                    console.log(`[FAUCET][INFO] update faucet config: ${transactionsCapacity}`);
                    await updateFaucetConfig(faucetConfig, transactionsCapacity)
                }
                const userTransaction = response[index];
                if (!ethers.utils.isAddress(userTransaction.owner_address)) {
                    await updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, 'wrong owner_address', 'success')
                    continue;
                }

                try {
                    console.log(`[FAUCET][INFO] Sending transaction for ${userTransaction.owner_address}`)
                    const tx = await tokenContract.transfer(userTransaction.owner_address, faucetConfig.amount_to_transfer);
                    await updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, tx.hash, 'pending');
                    await tx.wait();
                    console.log(`[FAUCET][INFO] Transaction for ${userTransaction.owner_address} finished with success`)
                    await updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'success')
                } catch (error) {
                    console.log(`[FAUCET][INFO] Transaction for ${userTransaction.owner_address} finished with failure ${error.message}`)
                    await updateExplorerTransaction(userTransaction.id, userTransaction.owner_address, undefined, 'initiated')
                }
            }
        }
        setTimeout(runFaucetBot, 2000);
    } catch (e) {
        console.log(`[FAUCET][ERROR]: ${e}`);
        console.log(`[FAUCET][ERROR]: ${e.message}`);
        console.log(`[FAUCET][ERROR]: Start fetching again....`);
        setTimeout(runFaucetBot, 2000);
    }
}

const getFaucetConfig = async (network) => {
    let response = (await axios.get(faucetConfigApiUrl)).data.filter(config => config.network === network);
    if(response && response.length > 0) {
        return response[response.length - 1];
    } else {
        return null;
    }
}

const updateFaucetConfig = async (config, transactionsCapacity) => {
    (await axios.put(faucetConfigApiUrl + `${config.id}/`,{amount_to_transfer: config.amount_to_transfer, transactions_capacity: transactionsCapacity})).data;
}

const updateExplorerTransaction = async (transactionId, ownerAddress, txHash, status) => {
    const data = { owner_address: ownerAddress };
    if (status) {
        data.status = status;
    }
    if (txHash) {
        data.tx_hash = txHash;
    }
    try {
        await axios.put(faucetApiUrl + transactionId + "/", data);
    } catch (error) {
        console.log(`[FAUCET][ERROR]: ${error.message}`);
    }
};

console.log('<<<<<<ssv-faucet-bot started>>>>>>');

runFaucetBot();
