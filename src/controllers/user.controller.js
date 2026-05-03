import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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

    // send response
    res.status(200).json({
        success: true,
        message: "User registered successfully",
        data: createdUser,
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
