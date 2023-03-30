const { Telegraf } = require('telegraf')
require ('dotenv').config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
const date = new Date().toLocaleDateString();

bot.start((ctx:any) => {
    console.log("New user has joined the bot")
ctx.reply(`🚀Welcome to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex on easy to use way \n\n 🕒 Time ${date}`)
})

export const sendTelegramNote = async (message: any) => {
    const chatIDs = ["1069843486", "1502424561"];
    chatIDs.forEach(chat => {
      bot.telegram.sendMessage(chat, message, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }).catch((error: any) => {
        console.log("Encouterd an error while sending notification to ", chat)
        console.log(error)
      })
    });
  };


bot.help((ctx:any) => ctx.reply('Send me a sticker'))
bot.launch()

