import mongoose, { Schema } from "mongoose";

const tradeSchema = new Schema(
    {
        tradeId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        assetName: {
            type: String,
            required: [true, "Asset Name is required"],
            trim: true,
        },
        ticker: {
            type: String,
            required: [true, "Ticker name is required"],
            trim: true,
        },
        tradeType: {
            type: String,
            enum: ["Buy", "Sell"],
            required: [true, "Trade type is required"],
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
        },
        currency: {
            type: String,
            enum: ["INR", "USD", "EUR", "GBP", "JPY"],
            required: [true, "Currency is required"],
        },
        pricePerUnit: {
            type: Number,
            required: [true, "Price per unit is required"],
        },
        tradeDate: {
            type: Date,
            required: [true, "Trade date is required"],
        },
        reason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

export const Trades = mongoose.model("Trade", tradeSchema);
