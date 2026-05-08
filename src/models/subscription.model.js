import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        stripeCustomerId: {
            type: String,
            required: true,
        },

        stripeSubscriptionId: {
            type: String,
            required: true,
            unique: true,
        },

        stripePriceId: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: [
                "active",
                "canceled",
                "incomplete",
                "incomplete_expired",
                "past_due",
                "trialing",
                "unpaid",
            ],
            required: true,
        },

        currentPeriodStart: {
            type: Date,
            required: true,
        },

        currentPeriodEnd: {
            type: Date,
            required: true,
        },

        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
