import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (filePath) => {
    try {
        if (!filePath) {
            throw new Error("File path is required");
        }
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "image"
        });
        console.log(result)

        return result;
    }
    catch (error) {
        fs.unlinkSync(filePath);
        throw error;
    }
}