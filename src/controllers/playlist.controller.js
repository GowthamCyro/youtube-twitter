import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name || !description){
        throw new ApiError(401,"Playlist cannot be created without name and description");
    }

    const playlist = await Playlist.create({
        name : name,
        description : description,
        owner : req.user?._id
    })
    
    if(!playlist){
        throw new ApiError(501,"Something went wrong while creating the playlist. Please Try Again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {

    const {userId} = req.params
    
    if(!isValidObjectId(userId)){
        throw new ApiError(401,"The userId is invalid.Please Check");
    }

    const getUserPlaylist = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "playlists",
                localField : "_id",
                foreignField : "owner",
                as : "playlists",
                pipeline : [
                    {
                        $project : {
                            name : 1,
                            description : 1,
                            createdAt : 1,
                            videos : 1
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from : "subscribers",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $addFields :
            {
                playlists : "$playlists",
                subscribersCount : {
                    $size : "$subscribers"
                }
            }
        },
        {
            $project : {
                username : 1,
                "avatar.url" : 1,
                fullName : 1,
                playlists : 1,
                subscribersCount : 1
            }
        }
    ])

    if(!getUserPlaylist){
        throw new ApiError(401,"Something went wrong while getting user playlist.Please Try Again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,getUserPlaylist,"Fetched User Playlists"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid Playlist Id");
    }

    const playlist = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerInfo",
                pipeline : [
                    {
                        $lookup : {
                            from : "subscribers",
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
                            "avatar.url" : 1,
                            fullName : 1,
                            username : 1,
                            subscribersCount : 1
                        }
                    }
                ]
            }
        }
    ])

    if(!playlist){
        throw new ApiError(501,"Unable to fetch the playlist please try again ")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"Playlist Fetched Successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid playlist Id. Please Check");
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid Video Id. Please Check");
    }

    const video = await Video.findById(videoId);
    
    if(!video) {
        throw new ApiError(401,"Video not found");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(401,"Playlist not found");
    }
    
    if((video?.owner.toString() && playlist?.owner.toString()) !== req.user?._id.toString()){
        throw new ApiError(401,"You are not the owner to add the video to the playlist");
    }

    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $addToSet : {
                videos : video
            }
        },{
            new : true
        }
    )

    if(!addVideoToPlaylist){
        throw new ApiError(501,"Something went wrong while adding video to the playlist");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,addVideoToPlaylist,"Video Successfully Added to the playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const {playlistId,videoId} = req.params
    // TODO: remove video from playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"playlist id is not valid")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(401,"video id is not valid");
    }

    const video = await Video.findById(videoId);
    
    if(!video){
        throw new ApiError(401,"Video not found");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(401,"Playlist not found");
    }

    if((video?.owner.toString() && playlist?.owner.toString()) !== req.user?._id.toString()){
        throw new ApiError(401,"You are not the owner to add the video to the playlist");
    }
    
    
    const removedVideoFromPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $pull : {
                videos : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new : true
        }
    )

    if(!removedVideoFromPlaylist){
        throw new ApiError(401,"Unable to remove video from the playlist please try again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,removedVideoFromPlaylist,"Video Successfully removed from the playlist"));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(401,"Playlist not Found");
    }

    if( playlist?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not the owner to add the video to the playlist");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if(!deletedPlaylist){
        throw new ApiError(401,"Something went wrong while deleting the playlist please try again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,deletedPlaylist,"Playlist Deleted Sucessfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid Playlist Id");
    }

    if(!name || !description){
        throw new ApiError(401,"Name and Description is required to update");
    }

    const playlist = await Playlist.findById(playlistId);

    if( playlist?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not the owner to add the video to the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set : {
                name : name,
                description : description
            }
        },
        {
            new : true
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(501,"Something went wrong when updating playlist please try agian");
    }

    return res.
    status(200)
    .json(new ApiResponse(200,updatedPlaylist,"Playlist updated Successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
