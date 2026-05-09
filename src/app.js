import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { handleStripeWebhook } from "./controllers/subscription.controller.js";

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Portfolio Pulse API",
            version: "1.0.0",
            description:
                "AI-enhanced backend for tracking and analysing your trading portfolio.",
        },
        servers: [{ url: "/api/v1" }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string" },
                    },
                },
                Success: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string" },
                    },
                },
            },
        },
    },
    apis: ["./src/routes/*.js"],
});

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }),
);

// ⚠️ Webhook must be registered BEFORE express.json() to preserve raw body
app.post(
    "/api/v1/subscription/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook,
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Route Imports

import userRoutes from "./routes/user.routes.js";
import tradeRoutes from "./routes/trade.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";

// Routes Declaration

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/trade", tradeRoutes);
app.use("/api/v1/analysis", analysisRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);

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
export default app;
