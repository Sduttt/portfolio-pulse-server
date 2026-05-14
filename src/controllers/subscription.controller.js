import Stripe from "stripe";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import sendEmail from "../utils/emailconfig.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sendSubscriptionConfirmationEmail = async (
    user,
    periodStart,
    periodEnd,
) => {
    const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

    const startFormatted = formatDate(periodStart);
    const endFormatted = formatDate(periodEnd);

    const subject = "Your Portfolio Pulse Subscription is Active!";
    const text = `Hi ${user.fullName}, your subscription is now active from ${startFormatted} to ${endFormatted}.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: 0.5px;">Portfolio Pulse</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Premium Subscription Confirmed</p>
            </div>

            <div style="background: white; border-radius: 0 0 12px 12px; padding: 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hi <strong>${user.fullName}</strong>,</p>
                <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
                    Thank you for subscribing! Your account is now active and you have full access to AI-powered trade analysis.
                </p>

                <!-- Subscription Details Card -->
                <div style="background: #f4f4f4; border-radius: 8px; padding: 24px; margin-bottom: 28px;">
                    <h3 style="color: #444; font-size: 15px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.8px;">Subscription Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px; width: 50%;">Plan</td>
                            <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: bold; text-align: right;">Portfolio Pulse Pro</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #e0e0e0;">Status</td>
                            <td style="padding: 8px 0; text-align: right; border-top: 1px solid #e0e0e0;">
                                <span style="background: #e6f9f0; color: #27ae60; font-size: 12px; font-weight: bold; padding: 3px 10px; border-radius: 20px;">ACTIVE</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #e0e0e0;">Billing Period Start</td>
                            <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: bold; text-align: right; border-top: 1px solid #e0e0e0;">${startFormatted}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #e0e0e0;">Next Renewal Date</td>
                            <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: bold; text-align: right; border-top: 1px solid #e0e0e0;">${endFormatted}</td>
                        </tr>
                    </table>
                </div>

                <!-- What you unlocked -->
                <div style="margin-bottom: 28px;">
                    <h3 style="color: #444; font-size: 15px; margin: 0 0 12px;">What you've unlocked</h3>
                    <ul style="padding: 0; margin: 0; list-style: none;">
                        <li style="padding: 6px 0; color: #555; font-size: 14px;">✅ &nbsp;AI-powered trade analysis</li>
                        <li style="padding: 6px 0; color: #555; font-size: 14px;">✅ &nbsp;Unlimited analysis generations</li>
                        <li style="padding: 6px 0; color: #555; font-size: 14px;">✅ &nbsp;Portfolio health insights</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Go to Dashboard</a>
                </div>

                <p style="color: #aaa; font-size: 12px; line-height: 1.6; margin: 0; padding-top: 20px; border-top: 1px solid #eee;">
                    Your subscription renews automatically on <strong>${endFormatted}</strong>. You can cancel anytime from your account settings.<br>
                    If you have any questions, reply to this email.
                </p>
            </div>
        </div>
    `;

    await sendEmail(user.email, subject, text, html);
};

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

        // Send confirmation email (non-blocking)
        sendSubscriptionConfirmationEmail(
            req.user,
            new Date(periodStart * 1000),
            new Date(periodEnd * 1000),
        ).catch((err) =>
            console.error("Failed to send subscription email:", err),
        );
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

            // Send confirmation email (non-blocking)
            User.findById(userId).then((user) => {
                if (user) {
                    sendSubscriptionConfirmationEmail(
                        user,
                        new Date(periodStart * 1000),
                        new Date(periodEnd * 1000),
                    ).catch((err) =>
                        console.error(
                            "Failed to send subscription email:",
                            err,
                        ),
                    );
                }
            });
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
