const { Telegraf } = require("telegraf");
import Tokens from "./data";
import { connectDB } from "../config/db";
import axios from "axios";
import { placeOrderButton, tokenMenu } from "./constant";
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

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);


const tokens = Tokens.map((token) => `USDC/${token.symbol}`);

const leverages = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const numRows = 2;
const numCols = 2;

const state: Record<number, UserState> = {};
bot.use(session())

export const tgWrapper = () => {
  console.log("starting...")

  bot.launch();
  bot.start((ctx: any) => {
    
    console.log("New user has joined the bot");

    const buttons = Tokens.map(token => {
      return  Markup.callbackButton(`USDC/${token.symbol}`, `USDC/${token.symbol}`);
    });
    state[ctx.from!.id] = {};
    ctx.reply(
      "🚀Welcome to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way \n Please select a token:", Extra.markup(
        
          Markup.inlineKeyboard(buttons, { columns: 2 })
      )      
    );

    bot.action(/USDC\/(.+)/, async (ctx: any) => {
      try {
        if (ctx.match[1]) {
          // Handle USDC/token selection
          const symbol = ctx.match[1];
    
          // update the selected button with a checkmark emoji
          const selectedButtonIndex = buttons.findIndex(
            (button) => button.callback_data === `USDC/${symbol}`
          );
    
          const prevSelectedButtonIndex =
            state[ctx.from!.id]?.selectedButtonIndex;
          if (
            prevSelectedButtonIndex !== undefined &&
            prevSelectedButtonIndex !== selectedButtonIndex
          ) {
            buttons[prevSelectedButtonIndex].text = buttons[
              prevSelectedButtonIndex
            ].text.replace(" ✅", "");
          }
    
          const selectedButtonText = buttons[selectedButtonIndex].text;
          if (!selectedButtonText.endsWith(" ✅")) {
            buttons[selectedButtonIndex].text += " ✅";
            state[ctx.from!.id].selectedButtonText = symbol;
          } else {
            console.log("already selected");
          }
          const newMarkup = Markup.inlineKeyboard(buttons, { columns: 2 });
    
          // update the message with the new button markup
          ctx.editMessageReplyMarkup(newMarkup);
          state[ctx.from!.id].selectedButtonIndex = selectedButtonIndex;
    
          // Fetch token price from the API
          
          const token = Tokens.find((t) => t.symbol === symbol);
    
          if (token) {
            const address = token.address;
            const response = await axios.get("https://api.gmx.io/prices");
            const prices = response.data;
    
            const tokenPrice = prices[address];
            const tokenPriceInUsd = (
              (tokenPrice / 1e18) *
              Math.pow(10, -12)
            ).toFixed(2);
    
            console.log("Token Price:", tokenPriceInUsd, "and symbol:", symbol);
          } else {
            console.log("Token not found");
          }
        } 

        
      } catch (error) {
        console.error(error);
      }
    });

    ctx.reply('Select Position:', Extra.markup(
      Markup.inlineKeyboard([
        Markup.callbackButton(`Long${state[ctx.from!.id].selectedDirection === true ? ' ✅' : ''}`, 'long'),
        Markup.callbackButton(`Short${state[ctx.from!.id].selectedDirection === false ? ' ✅' : ''}`, 'short'),
      ])
    ));


    ctx.reply('☛ Please Select leverage and, \n☛ Enter the order amount:', Extra.markup(
      Markup.inlineKeyboard([
        Markup.callbackButton("1", "1",),
        Markup.callbackButton("5", "5"),
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
  });

  
  bot.action(['long'], (ctx: any) => {
    state[ctx.from!.id].selectedDirection = true;
  
      ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        Markup.callbackButton(`Long${state[ctx.from!.id].selectedDirection === true ? ' ✅' : ''}`, 'long'),
        Markup.callbackButton(`Short${state[ctx.from!.id].selectedDirection === false ? ' ✅' : ''}`, 'short'),   
      ], { columns: 2 }));

  });

  bot.action(['short'], (ctx: any) => {
    state[ctx.from!.id].selectedDirection = false;

    ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        Markup.callbackButton(`Long${state[ctx.from!.id].selectedDirection === true ? ' ✅' : ''}`, 'long'),
        Markup.callbackButton(`Short${state[ctx.from!.id].selectedDirection === false ? ' ✅' : ''}`, 'short'),    
      ], { columns: 2 }));

  });

  bot.action(/^-?\d+(\.\d+)?$/, (ctx:any) => {
    const leverage = parseInt(ctx.match[0], 10);
    state[ctx.from!.id].leverage = leverage;
    console.log("Your leverage is:", leverage);

    ctx.editMessageReplyMarkup(Markup.inlineKeyboard(
      leverages.map((level) => {
        return Markup.callbackButton(`${level}x${state[ctx.from!.id].leverage === level ? ' 🔵' : ''}`, `${level}`);
      }), { columns: 2 }
    ));
  });

  bot.on("text", (ctx: any) => {
    const amount = parseFloat(ctx.message.text);
    if (!isNaN(amount)) {
      state[ctx.from!.id].amount = amount;
      const leverage = state[ctx.from!.id].leverage;
      const tokenSymbol = state[ctx.from.id].selectedButtonText;
  
      const sizeDelta = amount * leverage!;
      console.log(`The result for a amount: ${amount} and Result: ${sizeDelta}}`);
  
      const message = `Please confirm your order for ${
        state[ctx.from!.id].selectedDirection ? "Long" : "Short"
      } \n ${leverage} x ${amount} \n, the token is ${tokenSymbol} and the Total amount is : ${sizeDelta}`;
  
      ctx.reply(message, placeOrderButton);
    }
  });

  bot.action("place_order", async (ctx: any) => {
    const amount = state[ctx.from.id].amount;
    const leverage = state[ctx.from.id].leverage!;
    const tokenSymbol = state[ctx.from.id].selectedButtonText;

    if (typeof amount === "undefined") {
      ctx.reply("Please enter an amount before placing an order");
      return;
    }
    const sizeDelta = amount * leverage;
    const message = `Order placed for ${state[ctx.from!.id].selectedDirection ? "Long" : "Short"
      } ${leverage}x ${amount}  the token is ${tokenSymbol} and the total amount is: ${sizeDelta}`;

    console.log(`The result for amount: ${amount} and Result: ${sizeDelta}`);

    await placeOrder(ctx, message);
  });

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
  });

  bot.action("cancel_order", (ctx: any) => {
    // state[ctx.from!.id] = {};
    ctx.reply("Order cancelled.");
    ctx.reply(
      "🚀Welcome again to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way  \n\n Please select a token:",
      tokenMenu
    );
  });

}

// function for placing an order
export const placeOrder = async (ctx: any, message: any) => {
  const { token, selectedDirection, leverage, amount, acceptablePrice, symbol } =
    state[ctx?.from?.id ?? ""] || {};
  if (!ctx || !ctx.from || !token || !selectedDirection || !leverage || !amount) {
    return;
  }

  // Compute the order amount based on the selected leverage
  const _path = [config.USDC, token];
  const _indexToken = config.USDC;
  const _amountIn = utils.parseUnits(amount.toString(), 6);
  const _minOut = 0;
  const _sizeDelta = utils.parseUnits((amount * leverage).toString());
  const _isLong = selectedDirection;
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
    selectedDirection,
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
  console.log(token, selectedDirection, _sizeDelta);

  // Send a message to the user
  console.log(
    `Placing order for ${selectedDirection} ${leverage}x ${_sizeDelta} ${token}...`
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

