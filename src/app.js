import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
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

// Serve raw OpenAPI JSON spec
app.get("/docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// Swagger UI via CDN — no static file dependencies, works on Vercel
app.get("/docs", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Portfolio Pulse API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/docs/swagger.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      deepLinking: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`);
});

app.get("/", (req, res) => res.redirect("/docs"));

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
