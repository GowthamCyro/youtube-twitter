import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import {v4 as uuidv4 } from 'uuid';



cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        const publicId = uuidv4();
        
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            public_id: publicId,
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteOnCloudinary = async (public_id,resourceType = "image") => {
    try {
        if(!public_id) return null
    
        const response = await cloudinary.uploader.destroy(public_id,{
            resource_type : `${resourceType}`
        })
    } catch (error) {
        console.log("delete on cloudinary failed", error);
        return error;
    }
}



export {uploadOnCloudinary,deleteOnCloudinary}