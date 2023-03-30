import { Schema, model } from "mongoose";
import { IOrder } from "../types/interface";

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