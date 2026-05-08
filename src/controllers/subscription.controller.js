import Stripe from "stripe";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/v1/subscription/create-checkout-session
const createCheckoutSession = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user.emailVerified) {
        return res.status(403).json({
            success: false,
            message: "Please verify your email before subscribing",
        });
    }

    if (user.subscriptionStatus) {
        return res.status(400).json({
            success: false,
            message: "You already have an active subscription",
        });
    }

    // Create Stripe customer once, reuse after that
    let customerId = user.stripeCustomerId;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName,
            metadata: { userId: user._id.toString() },
        });
        customerId = customer.id;
        user.stripeCustomerId = customerId;
        await user.save({ validateBeforeSave: false });
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
        metadata: { userId: user._id.toString() },
    });

    return res.status(200).json({ success: true, url: session.url });
});

// POST /api/v1/subscription/cancel
const cancelSubscription = asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: "active",
    });

    if (!subscription) {
        return res.status(404).json({
            success: false,
            message: "No active subscription found",
        });
    }

    // cancel_at_period_end = true keeps access until the billing cycle ends
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
    });

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    return res.status(200).json({
        success: true,
        message:
            "Subscription will be canceled at the end of the current billing period",
    });
});

// GET /api/v1/subscription/status
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: "active",
    });

    return res.status(200).json({
        success: true,
        data: {
            isActive: req.user.subscriptionStatus,
            subscription: subscription || null,
        },
    });
});

// POST /api/v1/subscription/verify-session
// Called by frontend after redirect from Stripe checkout with ?session_id=...
const verifyCheckoutSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "Session ID is required",
        });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
        return res.status(400).json({
            success: false,
            message: "Payment not completed",
        });
    }

    // Confirm this session belongs to the logged-in user
    if (session.metadata.userId !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: "Session does not belong to this user",
        });
    }

    // Idempotent — skip if already activated (webhook may have already done it)
    const existing = await Subscription.findOne({
        stripeSubscriptionId: session.subscription,
    });

    if (!existing) {
        const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription,
        );
        const item = stripeSubscription.items.data[0];
        const periodStart =
            item.current_period_start ??
            stripeSubscription.current_period_start;
        const periodEnd =
            item.current_period_end ?? stripeSubscription.current_period_end;

        await Subscription.create({
            userId: req.user._id,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: item.price.id,
            status: stripeSubscription.status,
            currentPeriodStart: new Date(periodStart * 1000),
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        });

        await User.findByIdAndUpdate(req.user._id, {
            subscriptionStatus: true,
        });
    }

    return res.status(200).json({
        success: true,
        message: "Subscription activated successfully",
    });
});

// POST /api/v1/subscription/webhook  ← Stripe calls this, no auth middleware
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    console.log(
        "Webhook hit. Body type:",
        typeof req.body,
        "Is Buffer:",
        Buffer.isBuffer(req.body),
    );
    console.log("Signature header:", sig ? "present" : "missing");
    console.log(
        "Secret first 10 chars:",
        process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10),
    );

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET,
        );
    } catch (err) {
        console.error("Webhook verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;

    switch (event.type) {
        case "checkout.session.completed": {
            const stripeSubscription = await stripe.subscriptions.retrieve(
                data.subscription,
            );
            const userId = data.metadata.userId;
            const item = stripeSubscription.items.data[0];
            const periodStart =
                item.current_period_start ??
                stripeSubscription.current_period_start;
            const periodEnd =
                item.current_period_end ??
                stripeSubscription.current_period_end;

            await Subscription.create({
                userId,
                stripeCustomerId: data.customer,
                stripeSubscriptionId: stripeSubscription.id,
                stripePriceId: item.price.id,
                status: stripeSubscription.status,
                currentPeriodStart: new Date(periodStart * 1000),
                currentPeriodEnd: new Date(periodEnd * 1000),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            });

            await User.findByIdAndUpdate(userId, { subscriptionStatus: true });
            break;
        }

        case "customer.subscription.updated": {
            const sub = await Subscription.findOne({
                stripeSubscriptionId: data.id,
            });
            if (sub) {
                const updatedItem = data.items?.data[0];
                const updatedPeriodStart =
                    updatedItem?.current_period_start ??
                    data.current_period_start;
                const updatedPeriodEnd =
                    updatedItem?.current_period_end ?? data.current_period_end;
                sub.status = data.status;
                sub.currentPeriodStart = new Date(updatedPeriodStart * 1000);
                sub.currentPeriodEnd = new Date(updatedPeriodEnd * 1000);
                sub.cancelAtPeriodEnd = data.cancel_at_period_end;
                await sub.save();
                await User.findByIdAndUpdate(sub.userId, {
                    subscriptionStatus: data.status === "active",
                });
            }
            break;
        }

        case "customer.subscription.deleted": {
            const sub = await Subscription.findOne({
                stripeSubscriptionId: data.id,
            });
            if (sub) {
                sub.status = "canceled";
                await sub.save();
                await User.findByIdAndUpdate(sub.userId, {
                    subscriptionStatus: false,
                });
            }
            break;
        }

        default:
            break;
    }

    res.status(200).json({ received: true });
};

export {
    createCheckoutSession,
    cancelSubscription,
    getSubscriptionStatus,
    verifyCheckoutSession,
    handleStripeWebhook,
};
