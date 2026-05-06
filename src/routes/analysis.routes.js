import { Router } from "express";
import {
    analyzeTradeById,
    getAnalysisByTradeId,
    giveFeedbackToAnalysis
} from "../controllers/analysis.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";

const router = Router();

router
    .route("/:id")
    .post(verifyAccessToken, analyzeTradeById)
    .get(verifyAccessToken, getAnalysisByTradeId);
    
router
    .route("/:id/feedback")
    .patch(verifyAccessToken, giveFeedbackToAnalysis);


export default router;
