import { Schema, model } from "mongoose";

const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

interface IOrder {
    path: any,
    amountIn: any,
    indexToken: string,
    minOut: any,
    sizeDelta: any,
    collateralDelta: any,
    acceptablePrice: any,
    executionFee: any,
    callbackTarget: any,
    isLong: boolean,
    referralCode: string
}

const OrderSchema = new Schema<IOrder>(
    {
        path: { type: Array<String> },
        amountIn: { type: String },
        indexToken: { type: String },
        minOut: { type: Number },
        sizeDelta: { type: String },
        collateralDelta: { type: Number },
        acceptablePrice: { type: String },
        executionFee: { type: String },
        callbackTarget: { type: String },
        isLong: { type: Boolean },
        referralCode: { type: String },

    },
    {
        timestamps: true,
    }
);

export const Order = model<IOrder>("Order", OrderSchema)