const config = {
    // VERIFIED_ROLE_ID: '936274576801923163',
    FORM_URL: process.env.SSV_FORM_URL,
    CHANNEL_ID: process.env.SSV_DISCORD_BOT_CHANNEL,
    SHEET_REPLY_CHANNEL: process.env.SSV_SHEET_REPLY_CHANNEL,
    COLORS: {
        BLUE: 3447003,
        RED: 0xff1100,
        GRAY: 0x808080,
},
    MESSAGES: {
        MODE: {
            MOD: '**Alerting the Administrators**\n <@&723840404159594496> come check this out!',
            HELP: (authorId) => {
                return `**SSV Goerli Deposit Bot** <@!${authorId}>\n
             Welcome to the Deposit Bot for ssv.network Primus Testnet. \n
              This BOT will make a 32 goerlieth deposit to your validator. \n
               There will be 2 deposit distribution cycles each day.\n\n
                **Request flow:** \n
                 **1.** Every cycle the users verification will reset and you need to verify again at #2-verify. \n
                  **2.** Twice a day I will announce about an hour(might change from time to time) in advance before the \n
                   BOT Channel is open for messages. \n **3.** After the channel is open you can send your commands to the BOT. \n
                    **4.** The new BOT will receive your command and deposit 32 goerli straight to your validator. Do not \n
                     expect to see 32 goeth in your wallet. \n\n\n
                      **BOT rules:** \n
                      **1.** Each user is entitled to 1 deposit per week. \n
                      **2.** Only the wallet registering the validator to the ssv.network is eligible to participate using the bot. \n
                      **3.** If you made a deposit before but failed to register the validator with the same wallet to the  \n
                      ssv.network the bot will not accept your request.\n
                      **4.** There will be 2 cycles a day with about 1-hour announcement in advance (in this channel) once in  \n
                      the morning and again about 5-8 hours later UTC+2 \n
                      **5.** In each cycle the deposit channel may open and close a few times according to the number of \n
                      requests in the queue and the cycle is officially ended when the announced. \n
                      **6.** Trying to abuse the bot will result in a ban, disqualification from the testnet, and block. \n
                      **7.** Slow mode is enabled and set to 6 hours. This is to avoid abuse or BOT crashing. Make sure you \n
                      send the command without new lines seperated only with spaces. \n
                      **To generate HEX data for your deposit:** \n
                      **1.** Get to the validator deposit stage on: https://prater.launchpad.ethereum.org/en/overview and \n
                      change disabled to enabled by inspecting the button (on the launchpad \n
                      page)https://i.imgur.com/izYw5QU.gif \n\n
                      **2.** On the send deposit page - once Metamask is open, open the Data page and copy the Hex Data. \n
                      https://i.imgur.com/2XGOT9H.gif. Now move to Discord Bot Channel. \n\n
                      **Command Guide:** \n
                      Deposit command: (:warning:**remember!**:warning: you have to use the same wallet address used for \n
                      BOTH creating the HEX and registering the validator later on the ssv.network webapp). \n
                      \`+goerlieth address hex-data\` \n
                      BOT Guide: \n
                      \`+goerlieth help\``
            }
        },
        ERRORS: {
            ALREADY_DEPOSITED: (authorId) => {return `**Error!** <@!${authorId}> \n This hex has already been used \n To view the BOT guide use: https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653`},
            USER_ID_REGISTERED: (authorId) => {return `**Error!** <@!${authorId}> \n You already have another wallet registered. \n To view the BOT guide use: https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653`},
            WALLET_ADDRESS_REGISTERED: (authorId) => {return `**Error!** <@!${authorId}> \n This wallet is already registered to another Discord ID. \n To view the BOT guide use: https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653`},
            PREVIOUS_DEPOSIT_NOT_REGISTERED: (authorId) => {return `**Error!** <@!${authorId}> \n It seem there was no new validator registered to the network since your last deposit. \n Please make sure to registerd the depositd validator into the ssv network.  \n To view the BOT guide use: https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653`},
            INVALID_HEX: '**Error** \n Invalid `Hex`.',
            INVALID_ADDRESS: '**Error** \n Invalid `Address`.',
            UNKNOWN_ERROR: '**Error** \n Unknown error occurred.',
            WRONG_HEX: (authorId) => { return `**Error** \n <@!${authorId}> Transaction failed, please try again.`},
            INVALID_NUMBER_OF_ARGUMENTS_HEX: '**Error**\nInvalid number of arguments. Please provide your `hex` **after** the `address`.',
            SOMETHING_WENT_WRONG_RECEIVER_ELIGIBLE: '**Error** \n Something went wrong while confirming your transaction please try again.',
            FAUCET_DONT_HAVE_ETH: '"**Operation Unsuccessful** \n The Bot does not have enough Goerli ETH. Please try again at a different time."',
            CONTACT_THE_MODS: '**Error** \n Something went wrong. \n If this continues, please contact the mods of this bot by using command: \`!mod\`',
            REACHED_DAILY_GOERLI_ETH: (authorId) => {return `**Error!** <@!${authorId}> \n have reached your daily limit. \n To view the BOT guide use: https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653`},
            INVALID_NUMBER_OF_ARGUMENTS_ADDRESS: (authorId) => {return `**Error** \n <@!${authorId}> Please make sure you used the command properly.\n To view the BOT guide use: https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653`},
            END_OF_CYCLE: `**Cycle Ended** @everyone \n To read more about how the Deposit BOT work head here: \n https://discord.com/channels/936177490752319539/936275762942709800/938475017509957653 \n\n **See you in the next cycle!**`,
            OPERATION_UNSUCCESSFUL: (authorId, txHash) => {return `**Error** <@!${authorId}>  \n Failed to deposit. \n ${txHash ? `\n\n View the transaction on etherscan: https://goerli.etherscan.io/tx/${txHash}` : ''}`},
        },
        SUCCESS: {
            PROCESSING_TRANSACTION: (authorId) => {return `**Success!** \n <@!${authorId}> \n Your request was added to the queue.\n You will be mentioned by the BOT if and when the deposit was made to your validator.`},
            OPERATION_SUCCESSFUL: (authorId, txHash) => {return `**Deposit Sent!** \n Deposited 32 goerli ETH for \n <@!${authorId}> validator.\n You will not see Goerli in your wallet. As it is deposited straight to your validator.\n View the transaction on etherscan: https://goerli.etherscan.io/tx/${txHash}`},
        },
    },
};
module.exports = config;
