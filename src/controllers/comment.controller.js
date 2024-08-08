import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 5} = req.query

    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid Video Id")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(401,"Video not found");
    }

    const commentAggregate = Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "comment",
                as : "likes"
            }
        },
        {
            $addFields : {
                likesCount : {
                    $size : "$likes"
                },
                owner : {
                    $first : "$owner"
                },
                isLiked : {
                    $cond : {
                        if : { $in : [req.user?._id,"$likes.likedBy"] },
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project : {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    if(!commentAggregate){
        throw new ApiError(501,"Something went wrong while fetching comments")
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comment = await Comment.aggregatePaginate(commentAggregate,options);

    return res
    .status(200)
    .json(new ApiResponse(200,comment,"Comments Fetched Successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {videoId} = req.params
    const {content} = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid video Id");
    }

    if(!content){
        throw new ApiError(401,"Comment can not generated without content");
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(401,"Video not found");
    }

    const addComment = await Comment.create({
        content : content,
        video : videoId,
        owner : req.user?._id
    })

    if(!addComment){
        throw new ApiError(501,"Something went wrong while creating the comment");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,addComment,"Comment created Sucessfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params

    const {content} = req.body

    if(!isValidObjectId(commentId)){
        throw new ApiError(401,"Invalid comment Id");
    }

    if(!content){
        throw new ApiError(401,"Can not update comment without content");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(401,"Comment not found");
    }

    if(req.user?._id.toString() !== comment.owner.toString()){
        throw new ApiError(401,"You are not the owner to update the comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId,
        {
            $set : {
                content : content
            }
        },
        {
            new : true
        }
    )

    if(!updatedComment){
        throw new ApiError(401,"Something went wrong while updating the comment");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,updatedComment,"Comment updated Successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    if(!isValidObjectId(commentId)){
        throw new ApiError(401,"Invalid comment Id");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(401,"Comment not found");
    }

    if(req.user?._id.toString() !== comment.owner.toString()){
        throw new ApiError(401,"You are not the owner to delete the comment");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if(!deletedComment){
        throw new ApiError(401,"Something went wrong while updating the comment");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,deletedComment,"Comment deleted Successfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
