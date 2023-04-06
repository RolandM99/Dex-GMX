const CallbackQuery  = require('node-telegram-bot-api')
const { Telegraf, Markup } = require('telegraf')

require ('dotenv').config()

interface UserState {
  token?: string;
  longShort?: 'long' | 'short';
  leverage?: number;
  amount?: number;
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

const tokens = ['USDC/ETH', 'USDC/BTC', 'USDC/LINK', 'USDC/UNI'];
const leverages = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const numRows = 2;
const numCols = 2;

const state: Record<number, UserState> = {};

const tokenMenu = Telegraf.Extra
  .markdown()
  .markup((m:any) => {
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


  const longShortMenu = Telegraf.Extra
  .markdown()
  .markup((m:any) => m.inlineKeyboard([
    m.callbackButton('Long', 'select_long'),
    m.callbackButton('Short', 'select_short'),
  ]));

const leverageMenu = Telegraf.Extra
  .markdown()
  .markup((m:any) => m.inlineKeyboard(
    leverages.map((leverage) => m.callbackButton(`${leverage}x`, `select_leverage_${leverage}`))
  ));

bot.start((ctx:any) => {
    console.log("New user has joined the bot")
    state[ctx.from!.id] = {};
ctx.reply('🚀Welcome to NgGmxBot!🚀 \n A bot that facilitate trading on the GMX Dex platform on easy to use way  \n\n Please select a token:', tokenMenu )
})

bot.action(/^select_token_(.*)$/, (ctx:any) => {
  const token = ctx.match[1];
  state[ctx.from!.id].token = token;
  ctx.reply(`You selected ${token}. Long or short?`, longShortMenu);
});

bot.action('select_long', (ctx:any) => {
  state[ctx.from!.id].longShort = 'long';
  ctx.reply('Please select leverage:', leverageMenu);
});

bot.action('select_short', (ctx:any) => {
  state[ctx.from!.id].longShort = 'short';
  ctx.reply('Please select leverage:', leverageMenu);
});

bot.action(/^select_leverage_(.*)$/, (ctx:any) => {
  const leverage = parseInt(ctx.match[1], 10);
  state[ctx.from!.id].leverage = leverage;
  ctx.reply('Please enter the order amount:');
});

bot.on('text', (ctx:any) => {
  const amount = parseFloat(ctx.message.text);
  if (!isNaN(amount)) {
    state[ctx.from!.id].amount = amount;
    placeOrder(ctx, `Order placed for ${state[ctx.from!.id].longShort} ${state[ctx.from!.id].leverage}x ${amount} ${state[ctx.from!.id].token}.`);
  }
});

bot.action('cancel_order', (ctx:any) => {
  state[ctx.from!.id] = {};
  ctx.reply('Order cancelled.');
});

bot.launch();

export function placeOrder(ctx: any, message: any) {
  const chatIDs = ["1069843486"];
  chatIDs.forEach(chat => {
    bot.telegram.sendMessage(chat, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }).catch((error: any) => {
      console.log("Encouterd an error while sending notification to ", chat)
      console.log(error)
    })
  });
  const { token, longShort, leverage, amount } = state[ctx?.from?.id ?? ''] || {};
  if (!ctx || !ctx.from || !token || !longShort || !leverage || !amount) {
    return;
  }
 
  else {
    ctx.reply(`Placing order ${longShort} ${leverage}x ${amount} ${token}...`);
  }
  // TODO: implement the place order function here
  console.log(`Placing order for ${longShort} ${leverage}x ${amount} ${token}...`);
}


