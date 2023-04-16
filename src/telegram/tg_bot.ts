import { Order } from "./../models/schema";
const CallbackQuery = require("node-telegram-bot-api");
const { Telegraf, Markup } = require("telegraf");
import { constants, utils } from "ethers";
import { config } from "../config/config";
import { GmxWrapper } from "../core";
import Tokens from "./data";
import { connectDB } from "../config/db";
connectDB();

require("dotenv").config();

interface UserState {
  symbol?: string;
  token?: string;
  longShort?: boolean;
  leverage?: number;
  amount?: number;
  acceptablePrice?: any;
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const tokens = Tokens.map((token) => `USDC/${token.symbol}`);

const leverages = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const numRows = 2;
const numCols = 2;

const state: Record<number, UserState> = {};

const tokenMenu = Telegraf.Extra.markdown().markup((m: any) => {
  const keyboard = [];

  for (let i = 0; i < tokens.length; i += numCols) {
    const row = [];

    for (let j = 0; j < numCols; j++) {
      const tokenIndex = i + j;
      if (tokenIndex >= tokens.length) {
        break;
      }

      const token = tokens[tokenIndex];
      row.push(m.callbackButton(token, `select_token_${token}`));
    }

    keyboard.push(row);
  }

  return m.inlineKeyboard(keyboard);
});

const longShortMenu = Telegraf.Extra.markdown().markup((m: any) =>
  m.inlineKeyboard([
    m.callbackButton("Long", "select_long"),
    m.callbackButton("Short", "select_short"),
  ])
);

const placeCancelOrderButtons = Telegraf.Extra.markdown().markup((m: any) =>
  m.inlineKeyboard([
    m.callbackButton("Place Order", "place_order"),
    m.callbackButton("Cancel Order", "cancel_order")
])
);

// const cancelOrder = Telegraf.Extra.markdown().markup((m: any) =>
//   m.inlineKeyboard([m.callbackButton("Cancel Order", "cancel_order")])
// );

const leverageMenu = Telegraf.Extra.markdown().markup((m: any) =>
  m.inlineKeyboard(
    leverages.map((leverage) =>
      m.callbackButton(`${leverage}x`, `select_leverage_${leverage}`)
    )
  )
);

bot.start((ctx: any) => {
  console.log("New user has joined the bot");
  state[ctx.from!.id] = {};
  ctx.reply(
    "🚀Welcome to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way  \n\n Please select a token:",
    tokenMenu
  );
});

bot.command('close', async (ctx: any) => {
  try {
    await closeOrder(ctx);
  } catch (error) {
    console.error(error);
    ctx.reply('An error occurred while closing the order.');
  }
});

bot.action(/^select_token_(.*)$/, async (ctx: any) => {
  const symbol = ctx.match[1].split("/")[1];
  const token = Tokens.find((t) => t.symbol === symbol);

  console.log({ symbol });

  if (token) {
    const address = token.address;

    const response = await fetch("https://api.gmx.io/prices");
    const prices = await response.json();

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

bot.action("place_order", (ctx: any) => {
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

  placeOrder(ctx, message);

  ctx.reply(message);
});

bot.launch();

export const placeOrder = async (ctx: any, message: any) => {
  const chatIDs = ["1069843486"];
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
  const _referralCode = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const _callbackTarget = "0x0000000000000000000000000000000000000000";

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

  //if(createOrder){

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
  })

  const data = await orderDetails.save();

  console.log(data);

  //}

  ctx.reply(
    `Placing orders for ${symbol} token \n which is ${
      longShort ? "Long" : "Short"
    } \n of leverage of ${leverage} x \n amount: ${amount}...`
  );
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

  console.log("Order is: ", {order})

  // Reverse the path and set collateralDelta and withdrawETH fields
  const path = order.path.reverse();
  path[1] = config.WETH;
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