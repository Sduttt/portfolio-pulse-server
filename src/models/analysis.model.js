import mongoose, { Schema } from "mongoose";

const analysisSchema = new Schema(
    {
        tradeId: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        sentiment: {
            type: String,
            enum: ["Rational", "Emotional", "FOMO", "Panic", "Greed", "Fear"],
        },
        rationalityScore: {
            type: Number,
            min: [0, "Score cannot be less than 0"],
            max: [100, "Score cannot exceed 100"],
        },
        ai_feedback: {
            type: String,
        },
    },
    {
        timestamps: true,
    },
);

export const Analysis = mongoose.model("Analysis", analysisSchema);
