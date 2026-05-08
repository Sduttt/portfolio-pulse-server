import { asyncHandler } from "../utils/asyncHandler.js";
import { Trade } from "../models/trade.model.js";
import { Analysis } from "../models/analysis.model.js";
import mongoose from "mongoose";

const addTrade = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isEmailVerified = req.user.emailVerified;
    const {
        assetName,
        ticker,
        tradeType,
        quantity,
        currency,
        pricePerUnit,
        tradeDate,
        reason,
    } = req.body;

    if (!userId) {
        return res.status(404).json({
            success: false,
            message: "User not found. Please login to add a trade.",
        });
    }

    if (!isEmailVerified) {
        return res.status(403).json({
            success: false,
            message:
                "Email not verified. Please verify your email to add a trade.",
        });
    }

    if (
        !assetName ||
        !ticker ||
        !tradeType ||
        !quantity ||
        !currency ||
        !pricePerUnit ||
        !tradeDate
    ) {
        return res.status(400).json({
            success: false,
            message: "All fields are required to add a trade.",
        });
    }

    const newTrade = await Trade.create({
        userId,
        assetName,
        ticker,
        tradeType,
        quantity,
        currency,
        pricePerUnit,
        tradeDate,
        reason,
    });

    if (!newTrade) {
        return res.status(500).json({
            success: false,
            message: "Failed to add trade. Please try again.",
        });
    }

    res.status(201).json({
        success: true,
        data: newTrade,
    });
});

const getTrades = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isEmailVerified = req.user.emailVerified;

    if (!userId) {
        return res.status(404).json({
            success: false,
            message: "User not found. Please login to view trades.",
        });
    }

    const trades = await Trade.find({ userId })
        .sort({ tradeDate: -1 })
        .select(
            "assetName ticker tradeType quantity currency pricePerUnit tradeDate",
        );

    if (trades.length === 0) {
        return res.status(200).json({
            success: true,
            message:
                "No trades found. Start adding your trades to see them here.",
            data: [],
        });
    }

    res.status(200).json({
        success: true,
        tradeCount: trades.length,
        data: trades,
    });
});

const getTradeById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const tradeId = req.params.id;

    if (!userId) {
        return res.status(404).json({
            success: false,
            message: "User not found. Please login to view trade details.",
        });
    }

    const trade = await Trade.findOne({ _id: tradeId, userId }).select("-__v");

    if (!trade) {
        return res.status(404).json({
            success: false,
            message:
                "Trade not found. Please check the trade ID and try again.",
        });
    }

    res.status(200).json({
        success: true,
        data: trade,
    });
});

const updateTrade = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const tradeId = req.params.id;
    const {
        assetName,
        ticker,
        tradeType,
        quantity,
        currency,
        pricePerUnit,
        tradeDate,
        reason,
    } = req.body;

    if (!userId) {
        return res.status(404).json({
            success: false,
            message: "User not found. Please login to update trade details.",
        });
    }

    if (!mongoose.isValidObjectId(tradeId)) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid trade ID. Please check the trade ID and try again.",
        });
    }

    const trade = await Trade.findOne({ _id: tradeId, userId });

    if (!trade) {
        return res.status(404).json({
            success: false,
            message:
                "Trade not found. Please check the trade ID and try again.",
        });
    }

    trade.assetName = assetName || trade.assetName;
    trade.ticker = ticker || trade.ticker;
    trade.tradeType = tradeType || trade.tradeType;
    trade.quantity = quantity || trade.quantity;
    trade.currency = currency || trade.currency;
    trade.pricePerUnit = pricePerUnit || trade.pricePerUnit;
    trade.tradeDate = tradeDate || trade.tradeDate;
    trade.reason = reason || trade.reason;

    const updatedTrade = await trade.save();

    res.status(200).json({
        success: true,
        data: updatedTrade,
    });
});

const deleteTrade = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const tradeId = req.params.id;

    if (!userId) {
        return res.status(404).json({
            success: false,
            message: "User not found. Please login to delete trade.",
        });
    }

    if (!mongoose.isValidObjectId(tradeId)) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid trade ID. Please check the trade ID and try again.",
        });
    }

    const trade = await Trade.findOne({ _id: tradeId, userId });

    if (!trade) {
        return res.status(404).json({
            success: false,
            message:
                "Trade not found. Please check the trade ID and try again.",
        });
    }

    await Analysis.deleteMany({ tradeId: trade._id });
    await Trade.deleteOne({ _id: tradeId, userId });

    res.status(200).json({
        success: true,
        message: "Trade deleted successfully.",
    });
});

export { addTrade, getTrades, getTradeById, updateTrade, deleteTrade };
