import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
    // Reuse existing connection on warm serverless invocations
    if (mongoose.connection.readyState >= 1) return;

    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`,
        );
        console.log(
            "Connected to MongoDB:",
            connectionInstance.connection.host,
        );
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
};
