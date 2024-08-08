import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid video Id please check")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(401,"Video not Found");
    }

    const likeStatus = await Like.findOne({
        video : videoId,
        likedBy : req.user?._id
    })

    if(likeStatus){
        await Like.findByIdAndDelete(likeStatus._id);

        return res
        .status(200)
        .json(new ApiResponse(200,{isLiked : false},"Message Toggled Successfully"));
    }

    await Like.create({
        video : videoId,
        likedBy : req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200,{ isLiked : true },"Message Toggled Successfully"));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(401,"invalid comment id");
    }
    
    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(401,"Comment not found");
    }

    const likeStatus = await Like.findOne({
        comment : commentId,
        likedBy : req.user?._id
    })

    if(likeStatus){
        await Like.findByIdAndDelete(likeStatus._id)

        return res
        .status(200)
        .json(new ApiResponse(200,{isLiked : false},"Like Toggled Successfully"));
    }

    await Like.create({
        comment : commentId,
        likedBy : req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200,{isLiked : true},"Like Toggled Successfully"));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)){
        throw new ApiError(401,"Tweet id is not valid")
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(401,"Tweet not found");
    }

    const likeStatus = await Like.findOne({
        tweet : tweetId,
        likedBy : req.user?._id
    })

    if(likeStatus){
        await Like.findByIdAndDelete(likeStatus._id);

        return res
        .status(200)
        .json(new ApiResponse(200,{isLiked : false},"Like Toggled Successfully"));
    }

    await Like.create({
        tweet : tweetId,
        likedBy : req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200,{isLiked : true},"Like Toggled Successfully"));

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideosAggegate = await Like.aggregate([
        {
            $match : {
                likedBy : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "videos",
                pipeline:[
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "onwerDetails"
                        }
                    },
                    {
                        $unwind : "$onwerDetails"
                    }
                ]
            }
        },
        {
            $unwind : "$videos"
        },
        {
            $project : {
                videos : {
                title : 1,
                description : 1,
                "videoFile.url" : 1,
                "thumbnail.url" : 1,
                duration : 1,
                views : 1,
                isPublished : 1,
                onwerDetails : {
                    username : 1,
                    fullName : 1,
                    "avatar.url" : 1
                },
                createdAt : 1
                }, 
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggegate,
                "liked videos fetched successfully"
            )
        );

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}