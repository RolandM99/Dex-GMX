const CallbackQuery  = require('node-telegram-bot-api')
const { Telegraf } = require('telegraf')
const TelegramBot = require('node-telegram-bot-api')
const { InlineKeyboardButton, InlineKeyboardMarkup, InputTextMessageContent } = TelegramBot;
// const { CallbackQuery } = TelegramBot.types;
// const { CallbackQuery } = require('node-telegram-bot-api')
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

bot.on('callback_query', (callbackQuery: CallbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  if (callbackQuery.data === 'short_button') {
    bot.answerCallbackQuery({ callback_query_id: callbackQuery.id, text: 'Your order has been shorted', cache_time: 0.5 });
  } else if (callbackQuery.data === 'long_button') {
    bot.answerCallbackQuery({ callback_query_id: callbackQuery.id, text: 'your order has been longed', cache_time: 5 });
  } else {
    const amount = parseInt(callbackQuery.message.reply_markup.input_field_value.message_text);
    const value = parseInt(callbackQuery.data);
    const result = amount * value / 10;
    const text = `Amount: ${amount}\nLeverage: ${value}\nResult: ${result}`;
    bot.editMessageText({ chat_id: chatId, message_id: messageId, text: text });
  }
});

bot.on('message', (msg: { chat: { id: any; }; }) => {
  const chatId = msg.chat.id;
  const messageText = 'Enter amount:';
  const amountPlaceholder = 'Enter amount...';

  const slider = new InlineKeyboardMarkup({
    inline_keyboard: [
      [
        new InlineKeyboardButton({ text: '0', switch_inline_query_current_chat: '0' }),
        new InlineKeyboardButton({ text: '10', switch_inline_query_current_chat: '10' }),
        new InlineKeyboardButton({ text: '20', switch_inline_query_current_chat: '20' }),
        new InlineKeyboardButton({ text: '30', switch_inline_query_current_chat: '30' }),
        new InlineKeyboardButton({ text: '40', switch_inline_query_current_chat: '40' }),
        new InlineKeyboardButton({ text: '50', switch_inline_query_current_chat: '50' }),
      ]
    ],
  });

  const keyboard = new InlineKeyboardMarkup({
    inline_keyboard: [
      [
        new InlineKeyboardButton({ text: 'Short', callback_data: 'short_button' }),
        new InlineKeyboardButton({ text: 'Long', callback_data: 'long_button' }),
      ],
      [
        new InlineKeyboardButton({ text: 'Cancel', callback_data: 'cancel' }),
      ],
    ],
    input_field_placeholder: amountPlaceholder,
    input_message_content: new InputTextMessageContent({ message_text: amountPlaceholder }),
  });

  bot.sendMessage({ chat_id: chatId, text: messageText, reply_markup: keyboard });
  bot.sendMessage({ chat_id: chatId, text: 'Select leverage:', reply_markup: slider });
});



bot.help((ctx:any) => ctx.reply('Send me a sticker'))
bot.launch()

