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
