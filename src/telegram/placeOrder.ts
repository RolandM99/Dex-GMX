import { Order } from "../models/schema";
import { utils } from "ethers";
import { config } from "../config/config";
import { GmxWrapper } from "../core";
import {sendNotification, orderPlacedMessage} from "./tg_notifications"
import {UserState} from "./types/interfaces"

const state: Record<number, UserState> = {};

const placeOrder = async (ctx: any, message: any) => {
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
  
  export default placeOrder;