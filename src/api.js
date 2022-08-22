const axios = require('axios');
const utils = require('./utils');
const config = require('./config/config');
require('dotenv').config({path: '../.env'})
const {  SSV_GOERLI_API_URL, SSV_EXPLORER_URL } = process.env;

module.exports = {
    verify: async (walletAddress, publicKey, userId) => {
        try {
            const url = `${SSV_EXPLORER_URL}/api/incentivized_deposits/verify?wallet_address=${walletAddress}&public_key=${publicKey}&user_id=${userId}`
            await axios.get(url);
            return null
        } catch (e) {
            const data = e.response.data;
            const error = config.MESSAGES.ERRORS[data.verification_state.toUpperCase()];
            if(typeof error === 'function') return config.MESSAGES.ERRORS[data.verification_state.toUpperCase()](userId)
            return config.MESSAGES.ERRORS[data.verification_state.toUpperCase()]
        }
    },
    addLog: async (message, address, publicKey, hexData, txHash, registerToSsv = false) => {
        try {
            const url = `${SSV_EXPLORER_URL}/api/incentivized_deposits/`
            await axios.post(url, {
                tx_hash: txHash,
                hex_data: hexData,
                public_key: publicKey,
                wallet_address: address,
                user_id: message.authorId,
                registered_to_ssv: registerToSsv,
            })
        } catch (e) {
            console.log('<<<<<<<<<<<<<<<<<<<error in create log>>>>>>>>>>>>>>>>>>>')
            console.log('error message: ', e.message);
            console.log('log: ', {
                ip: 'none',
                user_id: message.authorId,
                public_key: publicKey,
                hex_data: hexData,
                tx_hash: txHash,
                registered_to_ssv: false,
                wallet_address: address,
            })
            console.log('<<<<<<<<<<<<<<<<<<<error in create log>>>>>>>>>>>>>>>>>>>')
        }
    },
    getGasPrice: async () => {
        try{
            const url = `${SSV_GOERLI_API_URL}?module=gastracker&action=gasoracle&apikey=${process.env.SSV_ETHERSCAN_API_KEY}`
            let lastGasPrice =  (await axios.get(url)).data.result.FastGasPrice
            if (isNaN(lastGasPrice)){
                return 990000000000
            }

            return await utils.convertToWei(lastGasPrice);
        }
        catch (e) {
            return 990000000000
        }
    }
}