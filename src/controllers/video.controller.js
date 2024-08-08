import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteOnCloudinary} from "../utils/cloudinary.js"
import { text } from "express"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    // query = the things general people search in search bar
    // sortBy = aesc/desc based on the sortType
    // sortType = views,createdBy,duration

    // aggregate pagination has the ability to serve paginations based on the page and limit

    // we need to create search index like the database need to search in text and description

    const pipeline = []

    if(query){
        pipeline.push({
            $search : {
                index : "search-videos",
                text : {
                    query : query,
                    path : ["title","description"]
                }
            }
        })
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(401,"Invalid UserId");
        }

        pipeline.push({
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        });
    }

    pipeline.push({$match : {isPublished : true} })

    if(sortBy && sortType){
        pipeline.push({
            $sort : {
                [sortType] : sortBy === "asc"? 1 : -1
            }
        })
    }
    else{
        pipeline.push({  $sort : { createdAt : -1} })
    }

    

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate,options);

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Vidoes Fetched Successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if([title,description].some((feild) => feild?.trim() === "")){
        throw new ApiError("Both title and description are required");
    }

    const videoFilePath = req.files?.videoFile[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path;

    if(!videoFilePath){
        throw new ApiError(401,"Video file is required");
    }

    if(!thumbnailFilePath){
        throw new ApiError(401,"Thumbnail is required");
    }

    const video = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);

    if(!video){
        throw new ApiError(401,"Video not uploaded properly");
    }

    if(!thumbnail){
        throw new ApiError(401,"Thumbnail not uploaded properly");
    }

    const sentVideo = await Video.create({
        videoFile : {
            public_id : video.public_id,
            url : video.secure_url
        },
        thumbnail : {
            public_id : thumbnail.public_id,
            url : thumbnail.secure_url
        },
        title : title,
        description : description,
        duration : video.duration,
        owner : req.user?._id,
        isPublished : false                              // check this.
    })

    const publishedVideo = await Video.findById(sentVideo._id);

    if(!publishedVideo){
        throw new ApiError(401,"Something went wrong while uploading to database")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,publishedVideo,"Video Uploaded Successfully"));

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid videoId please check");
    }

    const video = await Video.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes"
            }
        },
        {
            $lookup : {
                from : "comments",
                localField : "_id",
                foreignField : "video",
                as : "commentsNo"
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $lookup : {
                            from : "subscriptions",
                            localField : "_id",
                            foreignField : "channel",
                            as : "subscribers"
                        }
                    },
                    {
                        $addFields : {
                            subscribersCount : {
                                $size : "$subscribers"
                            },
                            isSubscirbed :{
                                $cond: {
                                    if : {$in : [req.user?._id , "$subscribers.subscriber"]},
                                    then : true,
                                    else : false
                                }
                            }
                        }
                    },
                    {
                        $project : {
                            "avatar.url" : 1,
                            username : 1,
                            subscribersCount : 1,
                            isSubscirbed : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                likes : {
                    $size : "$likes"
                },
                owner : {
                    $first : "$owner"
                },
                isLiked : {
                    $cond : {
                        if : {$in : [req.user?._id,"$likes.likedBy"]},
                        then : true,
                        else : false
                    }
                },
                commentsCount : {
                    $size : "$commentsNo",
                },
                comments : "$commentsNo"

            }
        },
        {
            $project : {
                "videoFile.url" : 1,
                title : 1,
                description : 1,
                views : 1,
                createdAt : 1,
                duration : 1,
                subscribersCount : 1,
                likes : 1,
                commentsCount : 1,
                comments : 1,
                owner : 1,
                isLiked : 1
            }
        }
    ])

    if(!video){
        throw new ApiError(401,"Failed to fetch the video");
    }

    const updatedOr = await Video.findByIdAndUpdate(videoId,{
        $inc : {
            views : 1
        },
    })


    await User.findByIdAndUpdate(req.user?._id,{
        $addToSet : {
            watchHistory : videoId
        }
    })

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video Fetched Successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Unable to process the videoId");
    }

    const {title,description} = req.body;
    const thumbnailFilePath = req.file?.path;

    if(!title && !description && !thumbnailFilePath){
        throw new ApiError(401,"Thumbnail or title or description is required to update the video");
    }

    const vid = await Video.findById(videoId);

    if(!vid){
        throw new ApiError(501,"No Video Found");
    }

    if(vid?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not the owner to delete the video");
    }

    const varia = {
        title : title,
        description : description,
        thumbnail : thumbnailFilePath
    }

    console.log(varia)

    for(let key in varia){
        if(varia[key] === null || varia[key] === undefined || varia[key] === ""){
            delete varia[key];
        }
    }

    console.log(varia)

    if(varia['thumbnail']){
        const deleteFile = vid.thumbnail.public_id;
        await deleteOnCloudinary(deleteFile)
        const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
        varia['thumbnail'] = {
            public_id : thumbnail.public_id,
            url : thumbnail.url
        }
    }

    console.log(varia)

    const video = await Video.findByIdAndUpdate(videoId,
        {
            $set : varia
        },
        {
            new : true
        }
    )

    if(!video){
        throw new ApiError(501,"Something went wrong while updating the video")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Updated video successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Issue occured while fetching the video the videoId")
    }

    const vid = await Video.findById(videoId);

    if(!vid){
        throw new ApiError(400,"Video Not Found");
    }

    if(vid?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not the owner to delete the video");
    }
    
    await deleteOnCloudinary(vid.thumbnail.public_id);
    await deleteOnCloudinary(vid.videoFile.public_id,"video");

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if(!deletedVideo){
        throw new ApiError(500,"Unable to delete the video please try again");
    }

    await Like.deleteMany({
        video: videoId
    })

     // delete video comments
    await Comment.deleteMany({
        video: videoId,
    })

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Video Deleted Sucessfully"));

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // check whether input is valid or not 
    // check whether the owner of the video is the user else he can not toggle
    // update the toggle 


    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Issue occured while fetching the video the videoId");
    }
    
    const {toggle} = req.body

    if(!toggle){
        throw new ApiError(401,"Please select whether to publish or unpublish");
    }

    const vid = await Video.findById(videoId);
    if(vid?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"you are not the owner to change the toggle of the video");
    }

    const video = await Video.findByIdAndUpdate(videoId,
        {
            $set : {
                isPublished : toggle
            }
        },
        {
            new : true
        }
    )

    if(!video){
        throw new ApiError(501,"Something went wrong with the server");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video Toggle Status updated"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
