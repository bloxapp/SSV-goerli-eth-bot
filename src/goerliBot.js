require('dotenv').config({path: '../.env'})
const utils = require('./utils.js');
const Web3 = require('web3');
const {getGasPrice} = require('./api.js');
const walletSwitcher = require("./initializers/WalletSwitcher");
new Web3(new Web3.providers.HttpProvider(process.env.SSV_INFURA_HTTPS_ENDPOINT));



module.exports = {
  checkWalletIsReady: async () => {
    return await utils.faucetIsReady(walletSwitcher.getWalletAddress(), 32);
  },
  runGoerliFaucet: async function (message, address, hexData) {
    try {
      const walletIdReady = await this.checkWalletIsReady();
      if(!walletIdReady) {
        console.log('!!!!!!!!!!!!!!!!!!!!!Both wallet are empty!!!!!!!!!!!!!!!!!!!!!!!!!');
        return false;
      }
      const nonce = await utils.getNonce();
      const latestGasPrice = await getGasPrice();
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<here>>>>>>>>>>>>>>>>>>>>>>>>');
      console.log(nonce);
      console.log(latestGasPrice);
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<here>>>>>>>>>>>>>>>>>>>>>>>>');
      console.log('nonce: ' + nonce);
      console.log('latestGasPrice: ' + latestGasPrice);
      await utils.sendGoerliEth(address, message, hexData, 32, nonce, Number(latestGasPrice));
      return true;
    } catch (e) {
      return false;
      console.log(e);
    }
  }
}
