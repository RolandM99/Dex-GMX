const { Telegraf, Markup } = require("telegraf");
import Tokens from "./data";
import { connectDB } from "../config/db";
import axios from "axios";
import {longShortMenu, placeCancelOrderButtons, leverageMenu, tokenMenu } from "./constant";
import { placeOrder, closeOrder } from "./getOrders";
import {UserState} from "./types/interfaces";

connectDB();

require("dotenv").config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const tokens = Tokens.map((token) => `USDC/${token.symbol}`);

const leverages = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const numRows = 2;
const numCols = 2;

const state: Record<number, UserState> = {};


bot.start((ctx: any) => {
  console.log("New user has joined the bot");
  state[ctx.from!.id] = {};
  ctx.reply(
    "🚀Welcome to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way  \n\n Please select a token:",
    tokenMenu
  );
});

bot.command("close", async (ctx: any) => {
  try {
    ctx.reply("Initiating closing an order...");

    await closeOrder(ctx);

    ctx.reply("Order closed");
  } catch (error) {
    console.error(error);
    ctx.reply("An error occurred while closing the order.");
  }
});

bot.action(/^select_token_(.*)$/, async (ctx: any) => {
  const symbol = ctx.match[1].split("/")[1];
  const token = Tokens.find((t) => t.symbol === symbol);

  console.log({ symbol });

  if (token) {
    const address = token.address;

    const response = await axios.get("https://api.gmx.io/prices");
    const prices = response.data;

    const tokenPrice = prices[address];
    const tokenPriceInUsd = ((tokenPrice / 1e18) * Math.pow(10, -12)).toFixed(
      2
    );

    // Add token address and tokenPrice to state object
    state[ctx.from!.id].token = address;
    state[ctx.from!.id].acceptablePrice = tokenPriceInUsd;
    state[ctx.from!.id].symbol = symbol;

    console.log(tokenPriceInUsd, "$");
    ctx.reply(
      `You selected ${symbol} and its current price on the market is: ${tokenPriceInUsd}$`
    );
  } else {
    ctx.reply("Token not found");
  }

  ctx.reply(` Long or short?`, longShortMenu);
});

bot.action("select_long", (ctx: any) => {
  state[ctx.from!.id].longShort = true;
  ctx.reply("You selected long");
  console.log("Long selected");

  ctx.reply("Please select leverage:", leverageMenu);
});

bot.action("select_short", (ctx: any) => {
  state[ctx.from!.id].longShort = false;
  console.log("Short selected");

  ctx.reply("You selected short");
  ctx.reply("Please select leverage:", leverageMenu);
});

bot.action(/^select_leverage_(.*)$/, (ctx: any) => {
  const leverage = parseInt(ctx.match[1], 10);
  state[ctx.from!.id].leverage = leverage;
  console.log("your leverage is :", leverage);

  ctx.reply("Please enter the order amount:");
});

bot.on("text", (ctx: any) => {
  const amount = parseFloat(ctx.message.text);
  if (!isNaN(amount)) {
    state[ctx.from!.id].amount = amount;
    const leverage = state[ctx.from!.id].leverage;
    const tokenSymbol = state[ctx.from.id].symbol;

    const sizeDelta = amount * leverage!;
    console.log(`The result for a amount: ${amount} and Result: ${sizeDelta}}`);

    const message = `Please confirm your order for ${
      state[ctx.from!.id].longShort ? "Long" : "Short"
    } \n ${leverage} x ${amount} \n, the token is ${tokenSymbol} and the Total amount is : ${sizeDelta}`;

    ctx.reply(message, placeCancelOrderButtons);
  }
});

bot.action("cancel_order", (ctx: any) => {
  // state[ctx.from!.id] = {};
  ctx.reply("Order cancelled.");
  ctx.reply(
    "🚀Welcome again to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way  \n\n Please select a token:",
    tokenMenu
  );
});

bot.action("place_order", async (ctx: any) => {
  const amount = state[ctx.from.id].amount;
  const leverage = state[ctx.from.id].leverage!;
  const tokenSymbol = state[ctx.from.id].symbol;

  if (typeof amount === "undefined") {
    ctx.reply("Please enter an amount before placing an order");
    return;
  }
  const sizeDelta = amount * leverage;
  const message = `Order placed for ${
    state[ctx.from!.id].longShort ? "Long" : "Short"
  } ${leverage}x ${amount}  the token is ${tokenSymbol} and the total amount is: ${sizeDelta}`;

  console.log(`The result for amount: ${amount} and Result: ${sizeDelta}`);

  await placeOrder(ctx, message);

  // ctx.reply(message);
});

bot.launch();


