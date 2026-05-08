import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyAccessToken = asyncHandler(async (req, res, next) => {
    try {
        const accessToken =
            req.cookies.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Access token is missing",
            });
        }

        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        await User.findById(decoded.userId)
            .select("-passwordHash -refreshToken")
            .then((user) => {
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid access token",
                    });
                }
                req.user = user;
                next();
            })
            .catch((error) => {
                return res.status(401).json({
                    success: false,
                    message: "Invalid access token",
                    error: error.message,
                });
            });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid access token",
            error: error.message,
        });
    }
});

export const requireEmailVerified = (req, res, next) => {
    if (!req.user?.emailVerified) {
        return res.status(403).json({
            success: false,
            message: "Please verify your email before subscribing",
        });
    }
    next();
};

export const requireSubscription = (req, res, next) => {
    if (!req.user?.subscriptionStatus) {
        return res.status(403).json({
            success: false,
            message:
                "An active subscription is required to access this feature",
        });
    }
    next();
};
