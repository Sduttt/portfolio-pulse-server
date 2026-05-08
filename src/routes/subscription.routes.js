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

router.post(
    "/create-checkout-session",
    verifyAccessToken,
    requireEmailVerified,
    createCheckoutSession,
);
router.post(
    "/cancel",
    verifyAccessToken,
    requireSubscription,
    cancelSubscription,
);
router.get("/status", verifyAccessToken, getSubscriptionStatus);
router.post("/verify-session", verifyAccessToken, verifyCheckoutSession);

export default router;
