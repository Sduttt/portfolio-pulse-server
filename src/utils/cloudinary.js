import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const deleteFromCloudinary = async (imageUrl) => {
    if (!imageUrl) return null;

    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{public_id}.{ext}
    
    const urlParts = imageUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex === -1) return null;

    let startIndex = uploadIndex + 1;
    // Skip optional version segment (e.g. "v1234567890")
    if (urlParts[startIndex] && /^v\d+$/.test(urlParts[startIndex])) {
        startIndex++;
    }

    const publicIdWithExt = urlParts.slice(startIndex).join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // strip extension

    return await cloudinary.uploader.destroy(publicId);
};

export const uploadOnCloudinary = async (filePath) => {
    try {
        if (!filePath) {
            throw new Error("File path is required");
        }
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "image",
        });

        fs.unlinkSync(filePath);

        return result;
    } catch (error) {
        fs.unlinkSync(filePath);
        throw error;
    }
};
