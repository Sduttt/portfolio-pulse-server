import { Router } from "express";
import {
    analyzeTradeById,
    getAnalysisByTradeId,
} from "../controllers/analysis.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";

const router = Router();

router
    .route("/:id")
    .post(verifyAccessToken, analyzeTradeById)
    .get(verifyAccessToken, getAnalysisByTradeId);

export default router;
