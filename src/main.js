require('discord-reply');
require('dotenv').config();
const web3 = require('web3');
const utils = require('./utils');
const redisStore = require('./redis');
const Logger = require('./logger.js');
const Discord = require('discord.js');
const config = require('./config/config');
const { verify } = require('./api.js');
const goerliBot = require('./goerliBot.js');
const {getTransactions} = require('./faucet.js');
const bot = require('./initializers/DiscordBot');
const queueHandler = require('./queueHandler.js');
const walletSwitcher = require("./initializers/WalletSwitcher");


let allowedValidatorsAmount;
let channelIsOnline = true;

const COMMAND_PREFIX = '+goerlieth';
const title = 'SSV Goerli Deposit Bot';
const adminID = [844110609142513675, 724238721028980756, 876421771400740874, 836513795194355765];

const EMBEDDED_HELP_MESSAGE = new Discord.MessageEmbed().setTitle(title).setColor(config.COLORS.GRAY)
    .addField("+goerlieth <address> <hex-data>", 'To start you need to register the **wallet address** you used to generate the **hex** and the **hex** itself.')
    .addField("+goerlieth help", 'Help with the bot.')
    .addField("+goerlieth mod", "Ping the admins for help if the **BOT** is malfunctioning (spamming this will result in a **BAN**)")

bot.on('ready', async function () {
    allowedValidatorsAmount = await getAmountOfValidatorsAllowed();
    Logger.log('I am ready!');
    queueHandler.executeQueueList();
})

bot.on('message', async (message) => {
    try {
        if (message.channel.id !== config.CHANNEL_ID) return
        if (!message || !message.content || message.content.substring(0, COMMAND_PREFIX.length) !== COMMAND_PREFIX) return;
        let text = '';
        const args = (message.content.substring(COMMAND_PREFIX.length).split(/ |\n/)).filter(n => n)
        const address = args[0];
        const hexData = args[1];
        let channel = message.channel;
        if (address === 'clean' && adminID.includes(Number(message.author.id))) {
            await redisStore.removeAllItems();
            return;
        }
        if (0 >= allowedValidatorsAmount && channelIsOnline) {
            console.log('<<<<<<<<<<<close channel>>>>>>>>>>>')
            channelIsOnline = false;
            const roleId = message.guild.roles.cache.filter(role => role.name === 'verified').first()?.id;
            await channel.updateOverwrite(roleId, {SEND_MESSAGES: false, VIEW_CHANNEL: true});
            await message.lineReply(config.MESSAGES.ERRORS.END_OF_CYCLE);
            return;
        }

        if (address === 'start' && adminID.includes(Number(message.author.id))) {
            const roleId = message.guild.roles.cache.filter(role => role.name === 'verified').first()?.id;
            console.log('<<<<<<<<<<<start channel>>>>>>>>>>>')
            allowedValidatorsAmount = await getAmountOfValidatorsAllowed();
            await channel.updateOverwrite(roleId, {SEND_MESSAGES: true, VIEW_CHANNEL: true});
            channelIsOnline = true;
            return;
        }

        // check if user request other commands
        if (address === 'help') {
            const attachment = new Discord.MessageAttachment('./src/img.png', 'img.png');
            EMBEDDED_HELP_MESSAGE.attachFiles(attachment).setImage('attachment://img.png');
            EMBEDDED_HELP_MESSAGE.setDescription(config.MESSAGES.MODE.HELP(message.author.id))
            await message.lineReply(EMBEDDED_HELP_MESSAGE);
        }

        // check user's params
        if (address === 'mod') text = config.MESSAGES.MODE.MOD;
        if (!address) {
            text = config.MESSAGES.ERRORS.INVALID_NUMBER_OF_ARGUMENTS_ADDRESS(message.author.id);
        }
        if (!hexData && address && web3.utils.isAddress(address)) {
            text = config.MESSAGES.ERRORS.INVALID_NUMBER_OF_ARGUMENTS_HEX;
        }
        if (!hexData && address && web3.utils.isHex(address)){
            text = config.MESSAGES.ERRORS.INVALID_NUMBER_OF_ARGUMENTS_ADDRESS(message.author.id);
        }

        if (address && hexData) {
            const isHex = web3.utils.isHexStrict(hexData);
            const isAddress = web3.utils.isAddress(address);

            if (isHex && isAddress) {
                const withCustomChecks = !adminID.includes(Number(message.author.id));
                console.log("DiscordID " + message.author.id + " is requesting " + 32 + " goerli eth.  Custom checks: " + false);
                let walletIsReady = await goerliBot.checkWalletIsReady(message)
                if (!walletIsReady) {
                    console.log("Faucet does not have enough ETH.");
                    if (message) {
                        await message.lineReply(config.MESSAGES.ERRORS.FAUCET_DONT_HAVE_ETH);
                    }
                    return;
                }
                const publicKey = `0x${hexData.substring(330, 426)}`;
                const verificationsIssues = await verify(address, publicKey, message.author.id)
                if(verificationsIssues && !adminID.includes(Number(message.author.id))) {
                    text = verificationsIssues;
                } else {
                    text = config.MESSAGES.SUCCESS.PROCESSING_TRANSACTION(message.author.id);
                    await redisStore.addToQueue({
                        message: message,
                        authorId: message.author.id,
                        username: message.author.username,
                    }, address, hexData);
                    allowedValidatorsAmount -= 1;
                }
            } else if (!isAddress) {
                text = config.MESSAGES.ERRORS.INVALID_ADDRESS;
            } else if (!isHex) {
                text = config.MESSAGES.ERRORS.INVALID_HEX;
            } else {
                text = config.MESSAGES.ERRORS.UNKNOWN_ERROR;
            }
        }


        if (text) {
            await message.lineReply(text);
        }

    } catch (e) {
        // Logger.log(e);
        const embed = new Discord.MessageEmbed().setDescription(config.MESSAGES.ERRORS.CONTACT_THE_MODS).setColor(0xff1100).setTimestamp();
        await message.lineReply(embed);
    }
});

async function getAmountOfValidatorsAllowed() {
    const itemsInQueue = (await redisStore.getQueueItems()).length
    const addressBalance = Number(await utils.getAddressBalance(walletSwitcher.getWalletAddress()));
    console.log(`faucet balance: ${addressBalance}`)
    console.log('Amount of validators able to register: ', Math.floor(addressBalance / 32 - itemsInQueue));
    return Math.floor(addressBalance / 32 - itemsInQueue);
}

getTransactions();
bot.login(process.env.SSV_DISCORD_BOT_TOKEN);