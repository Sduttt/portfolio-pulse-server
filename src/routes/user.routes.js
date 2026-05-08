import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getUserProfile,
    updateUserProfile,
    updateAvatar,
    deleteUser,
    sendVerificationEmail,
    verifyEmail,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.single("avatar"), registerUser);

router.route("/send-verification-email").post(sendVerificationEmail);
router.route("/verify-email").get(verifyEmail);

router.route("/login").post(loginUser);

// Secured routes
router.route("/logout").post(verifyAccessToken, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router
    .route("/change-password")
    .patch(verifyAccessToken, changeCurrentPassword);

router.route("/profile").get(verifyAccessToken, getUserProfile);
router.route("/profile").patch(verifyAccessToken, updateUserProfile);
router
    .route("/profile/avatar")
    .patch(verifyAccessToken, upload.single("avatar"), updateAvatar);
router.route("/profile").delete(verifyAccessToken, deleteUser);

export default router;
