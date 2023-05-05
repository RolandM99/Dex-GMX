const { Telegraf, Markup } = require("telegraf");
import Tokens from "./data";

// require("dotenv").config();

const tokens = Tokens.map((token) => `USDC/${token.symbol}`);

const leverages = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const numRows = 2;
const numCols = 2;

export const tokenMenu = Telegraf.Extra.markdown().markup((m: any) => {
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

export const longShortMenu = Telegraf.Extra.markdown().markup((m: any) =>
  m.inlineKeyboard([
    m.callbackButton("Long", "select_long"),
    m.callbackButton("Short", "select_short"),
  ])
);

export const placeOrderButton = Telegraf.Extra.markdown().markup((m: any) =>
  m.inlineKeyboard([
    m.callbackButton("Place Order", "place_order"),
  ])
);

export const leverageMenu = Telegraf.Extra.markdown().markup((m: any) =>
  m.inlineKeyboard(
    leverages.map((leverage) =>
      m.callbackButton(`${leverage}x`, `select_leverage_${leverage}`)
    )
  )
);