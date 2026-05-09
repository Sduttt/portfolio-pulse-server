import { Router } from "express";
import {
    createCheckoutSession,
    cancelSubscription,
    getSubscriptionStatus,
    verifyCheckoutSession,
} from "../controllers/subscription.controller.js";
import {
    verifyAccessToken,
    requireSubscription,
    requireEmailVerified,
} from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Subscriptions
 *   description: Stripe subscription management
 */

/**
 * @openapi
 * /subscription/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and a verified email address.
 *     responses:
 *       200:
 *         description: Checkout session URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, format: uri }
 *       403:
 *         description: Email not verified
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/create-checkout-session",
    verifyAccessToken,
    requireEmailVerified,
    createCheckoutSession,
);

/**
 * @openapi
 * /subscription/cancel:
 *   post:
 *     summary: Cancel active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       402:
 *         description: No active subscription
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/cancel",
    verifyAccessToken,
    requireSubscription,
    cancelSubscription,
);

/**
 * @openapi
 * /subscription/status:
 *   get:
 *     summary: Get current subscription status
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSubscribed: { type: boolean }
 *                 plan:         { type: string }
 *                 expiresAt:    { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 */
router.get("/status", verifyAccessToken, getSubscriptionStatus);

/**
 * @openapi
 * /subscription/verify-session:
 *   post:
 *     summary: Verify a completed Stripe checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId]
 *             properties:
 *               sessionId: { type: string }
 *     responses:
 *       200:
 *         description: Session verified and subscription activated
 *       400:
 *         description: Invalid or incomplete session
 *       401:
 *         description: Unauthorized
 */
router.post("/verify-session", verifyAccessToken, verifyCheckoutSession);

/**
 * @openapi
 * /subscription/webhook:
 *   post:
 *     summary: Stripe webhook endpoint (raw body required)
 *     tags: [Subscriptions]
 *     description: Called by Stripe. Do not call this manually.
 *     responses:
 *       200:
 *         description: Webhook processed
 */

export default router;
