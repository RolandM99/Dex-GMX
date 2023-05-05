const { Telegraf } = require("telegraf");
import Tokens from "./data";
import { connectDB } from "../config/db";
import axios from "axios";
import { longShortMenu, placeOrderButton, leverageMenu, tokenMenu } from "./constant";
import { Order } from "./../models/schema";
import { utils } from "ethers";
import { config } from "../config/config";
import { GmxWrapper } from "../core";
import { orderPlacedMessage } from "./tg_notifications"
import { UserState } from "./types/interfaces"
import getPnl from "./pnlOrders";
import { Extra, Markup, session } from "telegraf";


connectDB();

require("dotenv").config();

interface SessionData {
  selectedButtons: string[];
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.use(session())

const tokens = Tokens.map((token) => `USDC/${token.symbol}`);

const leverages = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const numRows = 2;
const numCols = 2;

const state: Record<number, UserState> = {};


export const tgWrapper = () => {
  console.log("starting")
  // launch tg bot  
  bot.launch();

  bot.start((ctx: any) => {
    console.log("New user has joined the bot");
    state[ctx.from!.id] = {};
    ctx.reply(
      "🚀Welcome to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way",
    );

    ctx.reply('Place an order by selecting the relevant options ', Extra.markup(
      Markup.inlineKeyboard([
        Markup.callbackButton('USDC/ETH', 'USDC/WBTC'),
        Markup.callbackButton('USDC/ETH', 'USDC/WBTC'),
        Markup.callbackButton('USDC/ETH', 'USDC/WBTC'),
        Markup.callbackButton('USDC/LINK', 'USDC/UNI')
      ], { columns: 2 })
    ));

    ctx.reply('Select trade direction :', Extra.markup(
      Markup.inlineKeyboard([
        Markup.callbackButton('Long', 'long'),
        Markup.callbackButton('Short', 'short'),
      ], { columns: 2 })
    ));

    ctx.reply('Select leverage :', Extra.markup(
      Markup.inlineKeyboard([
        Markup.callbackButton("1", "1",),
        Markup.callbackButton("10", "10"),
        Markup.callbackButton("15", "15",),
        Markup.callbackButton("20", "20",),
        Markup.callbackButton("25", "25",),
        Markup.callbackButton("30", "30",),
        Markup.callbackButton("35", "35",),
        Markup.callbackButton("40", "40"),
        Markup.callbackButton("45", "45"),
        Markup.callbackButton("50", "50")],
        { columns: 2 })
    ));

    // ctx.reply(placeOrderButton)

  });







  bot.command("help", (ctx: any) => {

  });




  bot.action(/.+/, (ctx: any) => {
    let session = ctx.session as SessionData;
    let selectedButtons = session.selectedButtons || [];
    let selectedLeverage = session.selectedButtons || [];
    const button = ctx.match[0];
    const index = selectedButtons.indexOf(button);

    if (index === -1) {
      selectedButtons.push(button);
    } else {
      selectedButtons.splice(index, 1);
    }

    session.selectedButtons = selectedButtons;

    ctx.editMessageReplyMarkup(
      Markup.inlineKeyboard([
        Markup.callbackButton(`Red${selectedButtons.includes('red') ? ' ✅' : ''}`, 'red'),
        Markup.callbackButton(`Green${selectedButtons.includes('green') ? ' ✅' : ''}`, 'green'),
        Markup.callbackButton(`Blue${selectedButtons.includes('blue') ? ' ✅' : ''}`, 'blue'),
        Markup.callbackButton(`Yellow${selectedButtons.includes('yellow') ? ' ✅' : ''}`, 'yellow'),
        Markup.callbackButton(`Orange${selectedButtons.includes('orange') ? ' ✅' : ''}`, 'orange'),
        Markup.callbackButton(`Purple${selectedButtons.includes('purple') ? ' ✅' : ''}`, 'purple')
      ], { columns: 2 })
    );
  });

  bot.command('values', (ctx: any) => {
    let session = ctx.session as SessionData;
    const selectedButtons = session.selectedButtons || [];
    if (selectedButtons.length > 0) {
      ctx.reply(`You have selected: ${selectedButtons.join(', ')}`);
    } else {
      ctx.reply('You have not selected any buttons yet.');
    }
  });












  bot.command('old', (ctx: any) => ctx.reply('Hello'));

  bot.command("orders", async (ctx: any) => {
    console.log("Fetching orders")
    const orders = await getOrders()

    if (orders) {
      if (orders.length > 0) {

        let message = "Open orders: \n"

        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          const data = `\n /CLS${order._id} ${order.amountIn} ${order.isLong ? "Long" : "Short"}`
          message = message + data
        }

        ctx.reply(message)

      } else {
        ctx.reply(`No open orders found`)
      }
    } else {
      ctx.reply(`Error fetching orders \n\n Error: ${orders}`)
    }

  })


  /**
   * handles closing open orders
   */
  bot.on("text", async (ctx: any) => {
    let text: string = ctx.message?.text ? ctx.message?.text : ctx.update.message.text || "";

    if (text.startsWith("/CLS")) {
      const orderId = text.split("/CLS")[1];

      await closeOrder(orderId)
    }
  })


  bot.command("close", async (ctx: any) => {
    try {
      /**
       * @todo close order
       * display all open orders
       * select order to close by providing its id
       * close order and notify user
       */

      await closeOrder(ctx);
    } catch (error) {
      console.error(error);
      ctx.reply("An error occurred while closing the order.");
    }
  });

  bot.command("pnl", async (ctx: any) => {
    try {
      state[ctx.from!.id] = {};
      ctx.reply("Initiating getting pnl...");
      await getPnl(ctx);
      ctx.reply("Getting profit and loss of your orders");
    } catch (error) {
      console.error(error);
      ctx.reply("An error occurred while getting pnl.");
    }
  })

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

  // const handleText1 = (ctx: any) => {
  //   const amount = parseFloat(ctx.message.text);
  //   if (!isNaN(amount)) {
  //     state[ctx.from!.id].amount = amount;
  //     const leverage = state[ctx.from!.id].leverage;
  //     const tokenSymbol = state[ctx.from.id].symbol;

  //     const sizeDelta = amount * leverage!;
  //     console.log(`The result for a amount: ${amount} and Result: ${sizeDelta}}`);

  //     const message = `Please confirm your order for ${state[ctx.from!.id].longShort ? "Long" : "Short"
  //       } \n ${leverage} x ${amount} \n, the token is ${tokenSymbol} and the Total amount is : ${sizeDelta}`;

  //     ctx.reply(message, placeCancelOrderButtons);
  //   }
  // };

  // const handleText2 = async (ctx: any) => {
  //   const input = ctx.message.text.trim();
  //   if (!/^\d+$/.test(input)) {
  //     return ctx.reply("Invalid input. Please enter a number.");
  //   }

  //   const index = parseInt(input) - 1;
  //   if (index < 0 || index >= (await orders).length) {
  //     return ctx.reply(`Invalid input. Please enter a number between 1 and ${(await orders).length}.`);
  //   }
  //   const order = (await orders)[index];

  //   // Reverse the path and set collateralDelta and withdrawETH fields
  //   const path = order.path.reverse();
  //   path[1] = config.USDC;
  //   const collateralDelta = 0;
  //   const withdrawETH = true;

  //   // Call the createDecreasePosition function to close the position
  //   const closeOrder = await GmxWrapper.createDecreasePosition(
  //     path,
  //     order.indexToken,
  //     collateralDelta,
  //     order.sizeDelta,
  //     order.isLong,
  //     config.RECEIVER_ADDRESS,
  //     order.acceptablePrice,
  //     order.minOut,
  //     order.executionFee,
  //     withdrawETH,
  //     order.callbackTarget
  //   );

  //   // Send a reply message to confirm the position has been closed
  //   await ctx.reply(`Position for ${order.path.join("-")} has been closed.`);
  // };

  // bot.on("text", handleText1);

  // bot.on("text", handleText2);

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
    const message = `Order placed for ${state[ctx.from!.id].longShort ? "Long" : "Short"
      } ${leverage}x ${amount}  the token is ${tokenSymbol} and the total amount is: ${sizeDelta}`;

    console.log(`The result for amount: ${amount} and Result: ${sizeDelta}`);

    await placeOrder(ctx, message);

    // ctx.reply(message);
  });
}

// function for placing an order
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

  const orderMessage = orderPlacedMessage(
    _indexToken,
    hash,
    longShort,
    leverage,
    amount,
    acceptablePrice,
    symbol
  );

  await ctx.reply(orderMessage, { parse_mode: "HTML" })

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

    const data = await orderDetails.save();

    // console.log(data);
  }
  console.log(token, longShort, _sizeDelta);

  // Send a message to the user
  console.log(
    `Placing order for ${longShort} ${leverage}x ${_sizeDelta} ${token}...`
  );
};

// Function for closing or cancelling an order
export const closeOrder = async (orderId: string) => {
  try {
    console.log(`Closing order id ${orderId}...`);
    await Order.findByIdAndUpdate(orderId, { isClosed: true });
  } catch (error) {
    console.log(error);
  }

}

const getOrders = async () => {
  try {
    return await Order.find({ isClosed: false }, "_id isLong amountIn").lean()
  } catch (error) {
    console.log("error fetching orders ", error)
  }
}


const createOrder = (ctx: any) => {
  try {
    const amount = parseFloat(ctx.message.text);
    if (!isNaN(amount)) {
      state[ctx.from!.id].amount = amount;
      const leverage = state[ctx.from!.id].leverage;
      const tokenSymbol = state[ctx.from.id].symbol;

      const sizeDelta = amount * leverage!;
      console.log(`The result for a amount: ${amount} and Result: ${sizeDelta}}`);

      const message = `Please confirm your order for ${state[ctx.from!.id].longShort ? "Long" : "Short"
        } \n ${leverage} x ${amount} \n, the token is ${tokenSymbol} and the Total amount is : ${sizeDelta}`;

      ctx.reply(message, placeOrderButton);
    }
  } catch (error) {
    console.log("error creating order ", error)
  }
}
