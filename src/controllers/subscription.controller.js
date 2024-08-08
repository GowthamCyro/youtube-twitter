import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(401,"Invalid channel Id");
    }

    const isSubscribed = await Subscription.findOne({
        channel : channelId,
        subscriber : req.user?._id
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res
        .status(200)
        .json(new ApiResponse(200,{isSubscribed : false},"Unsubscribed"));
    }
    await Subscription.create({
        channel : channelId,
        subscriber : req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200,{isSubscribed : true},"Subscribed"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(401,"Invalid channel Id");
    }

    // const subscribers = await Subscription.find({channel : channelId})
    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscriberInfo",
                pipeline : ([
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
                            }
                        }
                    },
                    {
                        $project : {
                            username : 1,
                            fullName : 1,
                            "avatar.url" : 1,
                            subscribersCount : 1
                        }
                    }
                ])
            }
        },
        {
            $project : {
                _id : 0,
                subscriberInfo : {
                    $first : "$subscriberInfo"
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,subscribers,"Subscribers fetched Successfully"));

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!subscriberId){
        throw new ApiError(401,"Invalid subscriber Id ");
    }

    const channelList = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "channel",
                foreignField : "_id",
                as : "subscribedChannel",
                pipeline : [
                    {
                        $lookup : {
                            from : "subscriptions",
                            localField : "_id",
                            foreignField : "channel",
                            as : "subscribers",
                        }
                    },
                    {
                        $addFields : {
                            subscribersCount : {
                                $size : "$subscribers"
                            }
                        }
                    },
                    {
                        $project : {
                            username : 1,
                            fullName : 1,
                            "avatar.url" : 1,
                            subscribersCount : 1
                        }
                    }
                ]
            }
        },
        {
            $project : {
                _id : 0,
                subscribedChannel : 1
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,channelList,"Channel List fetched Successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}