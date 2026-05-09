import { Router } from "express";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
import {
    addTrade,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
} from "../controllers/trade.controller.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Trades
 *   description: Manage trading records
 */

/**
 * @openapi
 * /trade:
 *   post:
 *     summary: Add a new trade
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, type, quantity, price, date]
 *             properties:
 *               symbol:   { type: string, example: AAPL }
 *               type:     { type: string, enum: [buy, sell] }
 *               quantity: { type: number, example: 10 }
 *               price:    { type: number, example: 182.5 }
 *               date:     { type: string, format: date }
 *               notes:    { type: string }
 *     responses:
 *       201:
 *         description: Trade added successfully
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all trades for the current user
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trades
 *       401:
 *         description: Unauthorized
 */
router
    .route("/")
    .post(verifyAccessToken, addTrade)
    .get(verifyAccessToken, getTrades);

/**
 * @openapi
 * /trade/{id}:
 *   get:
 *     summary: Get a trade by ID
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trade details
 *       404:
 *         description: Trade not found
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update a trade by ID
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:   { type: string }
 *               type:     { type: string, enum: [buy, sell] }
 *               quantity: { type: number }
 *               price:    { type: number }
 *               date:     { type: string, format: date }
 *               notes:    { type: string }
 *     responses:
 *       200:
 *         description: Trade updated successfully
 *       404:
 *         description: Trade not found
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete a trade by ID
 *     tags: [Trades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trade deleted successfully
 *       404:
 *         description: Trade not found
 *       401:
 *         description: Unauthorized
 */
router
    .route("/:id")
    .get(verifyAccessToken, getTradeById)
    .patch(verifyAccessToken, updateTrade)
    .delete(verifyAccessToken, deleteTrade);

export default router;
