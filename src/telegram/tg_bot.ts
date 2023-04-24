const { Telegraf, Markup } = require("telegraf");
import Tokens from "./data";
import { connectDB } from "../config/db";
import axios from "axios";
import {longShortMenu, placeCancelOrderButtons, leverageMenu, tokenMenu } from "./constant";
import { Order } from "./../models/schema";
import { utils } from "ethers";
import { config } from "../config/config";
import { GmxWrapper } from "../core";
import {sendNotification, orderPlacedMessage} from "./tg_notifications"
import {UserState} from "./types/interfaces"


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

export const placeOrder = async (ctx: any, message: any) => {
  const { token, longShort, leverage, amount, acceptablePrice, symbol } =
    state[ctx?.from?.id ?? ""] || {};
  if (!ctx || !ctx.from || !token || !longShort || !leverage || !amount) {
    return;
  }

  // Compute the order amount based on the selected leverage
  const _path = [config.USDC, token];
  const _indexToken = config.USDC;
  const _amountIn = utils.parseUnits(amount.toString(), 6);
  const _minOut = 0;
  const _sizeDelta = utils.parseUnits((amount * leverage).toString());
  const _isLong = longShort;
  const _acceptablePrice = utils.parseUnits(acceptablePrice.toString());
  const _executionFee = "180000000000000";
  const _referralCode =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  const _callbackTarget = "0x0000000000000000000000000000000000000000";

  console.log("We reached this point");

  //TODO: call the placeholder function

  const createOrder = await GmxWrapper.createIncreasePosition(
    _path,
    _indexToken,
    _amountIn,
    _minOut,
    _sizeDelta,
    _isLong,
    _acceptablePrice,
    _executionFee,
    _referralCode,
    _callbackTarget
  );

  const hash =
    "0x2b1f6bb6ffc6318912ea76134d6ecd861b224144e177ba4db684318cce2df9d4";

  const orderMessage = await orderPlacedMessage(
    _indexToken,
    hash,
    longShort,
    leverage,
    amount,
    acceptablePrice,
    symbol
  );

  await sendNotification(orderMessage);

  if (createOrder) {
    const orderDetails = new Order({
      path: _path,
      indexToken: _indexToken,
      amountIn: _amountIn,
      minOut: _minOut,
      sizeDelta: _sizeDelta,
      isLong: _isLong,
      acceptablePrice: _acceptablePrice,
      executionFee: _executionFee,
      referralCode: _referralCode,
      callbackTarget: _callbackTarget,
    });

    //const data = await orderDetails.save();

    //console.log(data);
  }
  console.log(token, longShort, _sizeDelta);

  // TODO: implement the place order function here
  console.log(
    `Placing order for ${longShort} ${leverage}x ${_sizeDelta} ${token}...`
  );
};

// Function for closing or cancelling an order

export const closeOrder = async (ctx: any) => {
  const { token, longShort, leverage } = state[ctx?.from?.id ?? ""] || {};
  if (!token || !longShort || !leverage) {
    return;
  }

  // Retrieve the order details from the database
  const order = await Order.findOne({ path: [config.USDC, token] }).sort({
    createdAt: -1,
  });

  if (!order) {
    return ctx.reply("No active order found.");
  }

  console.log("Order is: ", { order });

  // Reverse the path and set collateralDelta and withdrawETH fields
  const path = order.path.reverse();
  path[1] = config.USDC;
  const collateralDelta = 0;
  const withdrawETH = true;

  console.log("Path is: ", path);

  // Call the createDecreasePosition function to close the position
  const closeOrder = await GmxWrapper.createDecreasePosition(
    path,
    order.indexToken,
    collateralDelta,
    order.sizeDelta,
    order.isLong,
    config.RECEIVER_ADDRESS,
    order.acceptablePrice,
    order.minOut,
    order.executionFee,
    withdrawETH,
    order.callbackTarget
  );

  // Send a reply message to confirm the position has been closed
  ctx.reply(`Position for ${token} token has been closed.`);
};

