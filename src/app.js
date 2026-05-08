import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Route Imports

import userRoutes from "./routes/user.routes.js";
import tradeRoutes from "./routes/trade.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";

// Routes Declaration

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/trade", tradeRoutes);
app.use("/api/v1/analysis", analysisRoutes);

// Handle malformed JSON bodies
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON in request body",
        });
    }
    next(err);
});

export { app };
