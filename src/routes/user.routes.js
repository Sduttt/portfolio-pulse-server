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

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: User registration, login, and account management
 */

/**
 * @openapi
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:  { type: string }
 *               email:     { type: string, format: email }
 *               password:  { type: string, format: password }
 *               avatar:    { type: string, format: binary }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.route("/register").post(upload.single("avatar"), registerUser);

/**
 * @openapi
 * /user/send-verification-email:
 *   post:
 *     summary: Send email verification link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Verification email sent
 *       404:
 *         description: User not found
 */
router.route("/send-verification-email").post(sendVerificationEmail);

/**
 * @openapi
 * /user/verify-email:
 *   get:
 *     summary: Verify email via token in query param
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.route("/verify-email").get(verifyEmail);

/**
 * @openapi
 * /user/login:
 *   post:
 *     summary: Login and receive access + refresh tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful, tokens returned
 *       401:
 *         description: Invalid credentials
 */
router.route("/login").post(loginUser);

/**
 * @openapi
 * /user/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.route("/logout").post(verifyAccessToken, logoutUser);

/**
 * @openapi
 * /user/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token (from cookie or body)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token returned
 *       401:
 *         description: Invalid or expired refresh token
 */
router.route("/refresh-token").post(refreshAccessToken);

/**
 * @openapi
 * /user/change-password:
 *   patch:
 *     summary: Change current user's password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Incorrect old password
 *       401:
 *         description: Unauthorized
 */
router
    .route("/change-password")
    .patch(verifyAccessToken, changeCurrentPassword);

/**
 * @openapi
 * /user/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update user profile details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email:    { type: string, format: email }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete user account permanently
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Unauthorized
 */
router.route("/profile").get(verifyAccessToken, getUserProfile);
router.route("/profile").patch(verifyAccessToken, updateUserProfile);

/**
 * @openapi
 * /user/profile/avatar:
 *   patch:
 *     summary: Update avatar image
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *       401:
 *         description: Unauthorized
 */
router
    .route("/profile/avatar")
    .patch(verifyAccessToken, upload.single("avatar"), updateAvatar);
router.route("/profile").delete(verifyAccessToken, deleteUser);

export default router;
