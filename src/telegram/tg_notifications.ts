import { config } from "../config/config";

const { Telegraf, Markup } = require("telegraf");

//sending the actual notifcation on tg
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

export const sendNotification = async (message: any) => {
  const chatIDs = config.CHAT_ID;
  console.log(typeof chatIDs);
  chatIDs.forEach((chat) => {
    bot.telegram
      .sendMessage(chat, message, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      })
      .catch((error: any) => {
        console.log("Encouterd an error while sending notification to ", chat);
        console.log(error);
      });
  });
  console.log("Done!");
};

export const orderPlacedMessage = async (
  token: any,
  txHash: any,
  longShort: any,
  leverage: any,
  amount: any,
  acceptablePrice: any,
  symbol: any
) => {
  const sizeDelta = amount * leverage;

  const explorer = "https://arbiscan.io/";
  let message = "🎉🎉🎉 You have successfully placed an Order 👏👏👏";
  message += `\n\nSymbol: <b>${symbol}</b>`;
  message += `\nWhich is a: <b> ${longShort ? "Long" : "Short"}</b>`;
  message += `\nwith the leverage of: <b>${leverage}x</b> `;
  message += `\nthe amount is: <b> ${amount}$</b>,`;
  message += `\nthe total amount is <b>${sizeDelta}</b> `;
  message += `\nand the acceptable Price: <b>${acceptablePrice}$</b>  `;
  message += `\n\n <b>Index Token</b>`;
  message += `\n<a href="${explorer}/token/${token}">${token}</a>`;
  message += "\n\n <b>Transaction Hash</b> ";
  message += `\n<a href="${explorer}/tx/${txHash}">${txHash}</a>`;
  console.log("\n\nMessage ", message);
  return message;
};