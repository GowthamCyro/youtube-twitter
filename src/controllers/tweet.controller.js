import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;

    if(!content){
        throw new ApiError(401,"Content required to post a tweet")
    }

    const tweet = await Tweet.create({
        content : content,
        owner : req.user?._id
    })

    if(!tweet){
        throw new ApiError(501,"Something went wrong while creating the tweet")
    }


    return res
    .status(200)
    .json(new ApiResponse(200,tweet,"Tweet created Successfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(401,"invalid user Id")
    }

    const getAllTweetsOfUser = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "tweets",
                localField : "_id",
                foreignField : "owner",
                as : "tweetsk",
                pipeline : [
                    {
                        $lookup : {
                            from : "likes",
                            localField : "_id",
                            foreignField : "tweet",
                            as : "likeCount"
                        }
                    },{
                        $addFields : {
                            tweetLikesCount : {
                                $size : "$likeCount"
                            }
                        }
                    },
                    {
                        $project : {
                            _id : 1,
                            content : 1,
                            createdAt : 1,
                            tweetLikesCount : 1
                        }
                    }
                ]
            }
        },
        
        {
            $addFields : {
                tweets : "$tweetsk",
            }
        },
        {
            $project : {
                _id : 1,
                username : 1,
                fullName : 1,
                "avatar.url" : 1,
                tweets : 1,
                
            }
        }
    ]);

    if(!getAllTweetsOfUser){
        throw new ApiError(501,"Something went wrong");
    }

    return res
    .status(200)
    .json( new ApiResponse(200,getAllTweetsOfUser,"tweets fetched Successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const {content} = req.body
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(401,"Invalid tweet Id please check");
    }

    if(!content){
        throw new ApiError(401,"Content is required to update the tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId,
        {
            $set : {
                content : content
            },
        },
        {
            new : true
        }
    ).select("-createdAt")

    if(!updateTweet){
        throw new ApiError(501,"Something went wrong while updating the tweet. Please Try Again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,updatedTweet,"Tweet Updated Successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(401,"Invalid Tweet Id please check");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if(!deletedTweet){
        throw new ApiError(501,"Something went wrong while deleting the tweet");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,deletedTweet,"Successfully Deleted the Tweet"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
