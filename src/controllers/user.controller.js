import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncHandler(async (req, res) => {

    // get  user detaills from req.body
    const { email, fullName, password, avatar, profession, bio, dateOfBirth, gender } = req.body;
    const address = typeof req.body.address === "string"
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
            country
        }
    });

    const createdUser = await User.findById(newUser._id).select("-passwordHash -refreshToken");

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

})

