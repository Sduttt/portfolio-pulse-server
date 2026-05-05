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

router
    .route("/")
    .post(verifyAccessToken, addTrade)
    .get(verifyAccessToken, getTrades);

    
router
    .route("/:id")
    .get(verifyAccessToken, getTradeById)
    .patch(verifyAccessToken, updateTrade)
    .delete(verifyAccessToken, deleteTrade);

export default router;
