import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Trade } from "../models/trade.model.js";
import { Analysis } from "../models/analysis.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/emailconfig.js";

const generateAccesssAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error("Failed to generate tokens: " + error.message);
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get  user detaills from req.body
    const {
        email,
        fullName,
        password,
        avatar,
        profession,
        bio,
        dateOfBirth,
        gender,
    } = req.body;
    const address =
        typeof req.body.address === "string"
            ? JSON.parse(req.body.address)
            : req.body.address || {};
    const { city, country } = address;

    // validate user detaills

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required",
        });
    } else if (!fullName) {
        return res.status(400).json({
            success: false,
            message: "Full name is required",
        });
    } else if (!password) {
        return res.status(400).json({
            success: false,
            message: "Password is required",
        });
    } else if (!profession) {
        return res.status(400).json({
            success: false,
            message: "Profession is required",
        });
    } else if (!dateOfBirth) {
        return res.status(400).json({
            success: false,
            message: "Date of birth is required",
        });
    } else if (!gender) {
        return res.status(400).json({
            success: false,
            message: "Gender is required",
        });
    } else if (!city) {
        return res.status(400).json({
            success: false,
            message: "City is required",
        });
    } else if (!country) {
        return res.status(400).json({
            success: false,
            message: "Country is required",
        });
    } else if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format",
        });
    } else if (password && password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters long",
        });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email is already registered",
        });
    }

    // Check for avatar and upload to cloudinary
    let avatarUrl = "";

    if (req.file) {
        const uploadResult = await uploadOnCloudinary(req.file.path);
        avatarUrl = uploadResult?.secure_url || "";
    }

    // save user to database

    const newUser = await User.create({
        email,
        fullName,
        passwordHash: password,
        subscriptionStatus: false,
        avatar: avatarUrl,
        profession,
        bio,
        dateOfBirth,
        gender,
        address: {
            city,
            country,
        },
    });

    const createdUser = await User.findById(newUser._id).select(
        "-passwordHash -refreshToken",
    );

    if (!createdUser) {
        return res.status(500).json({
            success: false,
            message: "Failed to create user",
        });
    }

    // send verification email (non-blocking)
    buildAndSendVerificationEmail(newUser).catch((err) =>
        console.error("Failed to send verification email:", err),
    );

    // send response
    res.status(200).json({
        success: true,
        message:
            "User registered successfully. A verification email has been sent to your email address.",
        data: createdUser,
    });
});

const buildAndSendVerificationEmail = async (user) => {
    const verificationToken = jwt.sign(
        { userId: user._id },
        process.env.EMAIL_VERIFICATION_SECRET,
        { expiresIn: "1h" },
    );
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailSubject = "Verify your email for Portfolio Pulse";
    const emailText = `Please verify your email by clicking the following link: ${verificationLink}`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 0; border-radius: 10px;">
            <div style="background: white; margin: 20px; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #333; margin-bottom: 10px; font-size: 24px;">Welcome to Portfolio Pulse!</h2>
                <p style="color: #666; font-size: 14px; margin-bottom: 30px; line-height: 1.6;">Thank you for signing up. Please verify your email address to get started and unlock all features.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; transition: opacity 0.3s;">Verify Email Address</a>
                </div>
                <p style="color: #999; font-size: 12px; margin: 30px 0 0 0; padding-top: 30px; border-top: 1px solid #eee; line-height: 1.6;">
                    If you didn't create this account, you can safely ignore this email. This verification link will expire in 1 hour.<br>
                    <strong>Link:</strong> <a href="${verificationLink}" style="color: #667eea; text-decoration: none; word-break: break-all;">${verificationLink}</a>
                </p>
            </div>
        </div>
    `;
    return sendEmail(user.email, emailSubject, emailText, emailHtml);
};

const sendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required",
        });
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format",
        });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
        return res.status(404).json({
            success: false,
            message: "Email not found",
        });
    } else if (existingUser.emailVerified) {
        return res.status(400).json({
            success: false,
            message: "Email is already verified",
        });
    }

    const veryfyMail = await buildAndSendVerificationEmail(existingUser);
    if (!veryfyMail) {
        return res.status(500).json({
            success: false,
            message: "Failed to send verification email",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
        });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }

    const { accessToken, refreshToken } = await generateAccesssAndRefreshTokens(
        user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
        "-passwordHash -refreshToken",
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json({
            success: true,
            message: "User logged in successfully",
            data: {
                user: loggedInUser,
                accessToken,
                refreshToken,
            },
        });

    //send cookie with refresh token
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: "",
            },
        },
        {
            new: true,
        },
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json({
            success: true,
            message: "User logged out successfully",
        });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken ||
        req.body.refreshToken ||
        req.headers["x-refresh-token"];

    if (!incomingRefreshToken) {
        return res.status(400).json({
            success: false,
            message: "Unauthorized: No refresh token provided",
        });
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        const user = await User.findById(decodedToken.userId);

        if (!user || user.refreshToken !== incomingRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid refresh token",
            });
        }

        const cookiesOptions = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccesssAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookiesOptions)
            .cookie("refreshToken", newRefreshToken, cookiesOptions)
            .json({
                success: true,
                message: "Access token refreshed successfully",
                data: {
                    accessToken,
                },
            });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid refresh token",
        });
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: "Current password and new password are required",
        });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({
            success: false,
            message: "New password must be different from current password",
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: "New password must be at least 8 characters long",
        });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Current password is incorrect",
        });
    }

    user.passwordHash = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
        success: true,
        message: "Password changed successfully",
    });
});

const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-passwordHash -refreshToken",
    );

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "User profile retrieved successfully",
        data: user,
    });
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const { fullName, profession, bio, dateOfBirth, gender, address } =
        req.body;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                profession,
                bio,
                dateOfBirth,
                gender,
                address,
            },
        },
        { new: true },
    ).select("-passwordHash -refreshToken");

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "User profile updated successfully",
        data: user,
    });
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        return res.status(400).json({
            success: false,
            message: "No avatar file uploaded",
        });
    }

    const uploadResult = await uploadOnCloudinary(avatarLocalPath);

    if (!uploadResult) {
        return res.status(500).json({
            success: false,
            message: "Failed to upload avatar",
        });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    if (user?.avatar) {
        await deleteFromCloudinary(user.avatar);
    }

    user.avatar = uploadResult.secure_url;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
        success: true,
        message: "Avatar updated successfully",
        data: user,
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const trades = await Trade.find({ userId: req.user._id });

    await Promise.all([
        deleteFromCloudinary(user.avatar),
        ...trades.map((trade) => Analysis.deleteMany({ tradeId: trade._id })),
        Trade.deleteMany({ userId: req.user._id }),
        User.deleteOne({ _id: req.user._id }),
    ]);

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json({
            success: true,
            message: "User deleted successfully",
            data: user,
        });
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Verification token is required",
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.EMAIL_VERIFICATION_SECRET,
        );
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
        }

        user.emailVerified = true;
        await user.save({ validateBeforeSave: false });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired verification token",
        });
    }
});

export {
    registerUser,
    sendVerificationEmail,
    verifyEmail,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getUserProfile,
    updateUserProfile,
    updateAvatar,
    deleteUser,
};
