import { asyncHandler } from "../utils/asyncHandler.js";
import { Trade } from "../models/trade.model.js";
import { Analysis } from "../models/analysis.model.js";
import { analyzeTrade } from "../utils/aiAnalyzeTrade.js";
import mongoose from "mongoose";

const analyzeTradeById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const tradeId = req.params.id;

    if (!mongoose.isValidObjectId(tradeId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid trade ID.",
        });
    }

    const trade = await Trade.findOne({ _id: tradeId, userId });

    if (!trade) {
        return res.status(404).json({
            success: false,
            message: "Trade not found.",
        });
    }

    // Return cached analysis if it already exists for this trade
    const existing = await Analysis.findOne({ tradeId });
    if (existing) {
        return res.status(200).json({
            success: true,
            cached: true,
            data: existing,
        });
    }

    let aiResult;
    try {
        aiResult = await analyzeTrade(trade);
    } catch (err) {
        const isUnavailable =
            err.message?.includes("503") ||
            err.message?.includes("UNAVAILABLE") ||
            err.message?.includes("high demand");

        return res.status(isUnavailable ? 503 : 502).json({
            success: false,
            message: isUnavailable
                ? "AI service is temporarily unavailable due to high demand. Please try again later."
                : "AI analysis failed. Please try again.",
            error: err.message,
        });
    }

    const { sentiment, rationalityScore, feedback } = aiResult;

    const analysis = await Analysis.create({
        tradeId,
        sentiment,
        rationalityScore,
        ai_feedback: feedback,
    });

    return res.status(201).json({
        success: true,
        cached: false,
        data: analysis,
    });
});

const getAnalysisByTradeId = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const tradeId = req.params.id;

    if (!mongoose.isValidObjectId(tradeId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid trade ID.",
        });
    }

    // Ensure the trade belongs to the requesting user
    const trade = await Trade.findOne({ _id: tradeId, userId });
    if (!trade) {
        return res.status(404).json({
            success: false,
            message: "Trade not found.",
        });
    }

    const analysis = await Analysis.findOne({ tradeId });
    if (!analysis) {
        return res.status(404).json({
            success: false,
            message: "No analysis found for this trade. Run analysis first.",
        });
    }

    return res.status(200).json({
        success: true,
        data: analysis,
    });
});

const giveFeedbackToAnalysis = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const tradeId = req.params.id;
    const { users_response_to_ai, users_feedback } = req.body;

    if (!mongoose.isValidObjectId(tradeId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid trade ID.",
        });
    }

    // Ensure the trade belongs to the requesting user
    const trade = await Trade.findOne({ _id: tradeId, userId });
    if (!trade) {
        return res.status(404).json({
            success: false,
            message: "Trade not found.",
        });
    }

    const analysis = await Analysis.findOne({ tradeId });
    if (!analysis) {
        return res.status(404).json({
            success: false,
            message: "No analysis found for this trade. Run analysis first.",
        });
    }

    analysis.users_response_to_ai = users_response_to_ai || analysis.users_response_to_ai;
    analysis.users_feedback = users_feedback || analysis.users_feedback;

    await analysis.save();

    return res.status(200).json({
        success: true,
        data: analysis,
    });
});

export { analyzeTradeById, getAnalysisByTradeId, giveFeedbackToAnalysis };

