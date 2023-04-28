import Web3 from "web3";
import { Order } from "../models/schema";
import Tokens from "./data";
import { config } from "../config/config";
import { utils } from "ethers";


const web3 = new Web3(config.JSON_RPC);

async function getPrice(tokenAddress: string): Promise<number> {
  const tokenPrice = await web3.eth.getBalance(tokenAddress);
  const tokenPriceInEth = Number(web3.utils.fromWei(tokenPrice, "ether"));
  return tokenPriceInEth;
}

function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  });
  return formatter.format(amount);
}

const getPnl = async (ctx: any) => {
    // Retrieve all orders placed by the user from the database
    const orders = await Order.find({}).sort({ createdAt: -1 });
  
    if (orders.length === 0) {
      return ctx.reply("No active orders found.");
    }
  
    // Calculate the total profits and losses for all orders
    let totalPnl = 0;
    for (const order of orders) {
      const token = Tokens.find((t: { address: string; }) => t.address === order.indexToken);
      const tokenPrice = await getPrice(token?.address ?? "");
      const usdValue = parseFloat(utils.formatUnits(order.amountIn, 6)) * parseFloat(tokenPrice?.toString() ?? "");
      const delta = parseFloat(utils.formatUnits(order.sizeDelta, 6));
      const pnl = order.isLong ? delta : -delta;
      totalPnl += pnl * usdValue;
    }
  
    // Format the total P&L as USD
    const formattedPnl = formatCurrency(totalPnl);
  
    ctx.reply(`Total P&L: ${formattedPnl}`);
  };

  export default getPnl;