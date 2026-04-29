import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
        },
        passwordHash: {
            type: String,
            required: [true, "Password hash is required"],
        },
        subscriptionStatus: {
            type: Boolean,
            default: false,
        },
        avatar: {
            type: String,
        },
        profession: {
            type: String,
        },
        bio: {
            type: String,
        },
        dob: {
            type: Date,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: [true, "Gender is required"],
        },
        address: {
            city: {
                type: String,
                required: [true, "City is required"],
                trim: true,
            },
            country: {
                type: String,
                required: [true, "Country is required"],
                trim: true,
            },
        },
        refreshToken: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next){
    if(!this.isModified("passwordHash")){
        return next();
    }
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    next();
} )

userSchema.methods.comparePassword = async function (password){
    return await bcrypt.compare(password, this.passwordHash);
}

userSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        { 
            userId: this.userId, 
            email: this.email 
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

}

userSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        { 
            userId: this.userId
        },
        process.env.REFRESH_TOKEN_SECRET,
        { 
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
        }
    );
}


export const User = mongoose.model("User", userSchema);
