import { Router } from "express";
import {
    analyzeTradeById,
    getAnalysisByTradeId,
    giveFeedbackToAnalysis,
} from "../controllers/analysis.controller.js";
import {
    verifyAccessToken,
    requireSubscription,
} from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Analysis
 *   description: AI-powered trade analysis (requires active subscription)
 */

/**
 * @openapi
 * /analysis/{id}:
 *   post:
 *     summary: Trigger AI analysis for a trade
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Trade ID to analyse
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Analysis generated successfully
 *       402:
 *         description: Active subscription required
 *       404:
 *         description: Trade not found
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get existing AI analysis for a trade
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Trade ID
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Analysis returned
 *       402:
 *         description: Active subscription required
 *       404:
 *         description: Analysis not found
 *       401:
 *         description: Unauthorized
 */
router
    .route("/:id")
    .post(verifyAccessToken, requireSubscription, analyzeTradeById)
    .get(verifyAccessToken, requireSubscription, getAnalysisByTradeId);

/**
 * @openapi
 * /analysis/{id}/feedback:
 *   patch:
 *     summary: Submit feedback on an analysis
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Trade ID
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feedback]
 *             properties:
 *               feedback: { type: string, enum: [helpful, not_helpful] }
 *     responses:
 *       200:
 *         description: Feedback recorded
 *       404:
 *         description: Analysis not found
 *       401:
 *         description: Unauthorized
 */
router.route("/:id/feedback").patch(verifyAccessToken, giveFeedbackToAnalysis);

export default router;
