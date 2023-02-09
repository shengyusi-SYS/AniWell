import settings from '@s/store/settings'
import { users, UserData } from '@s/store/users'
import { signAccessToken, verifyToken } from '@s/utils/jwt'
import VideoTaskCenter from '@s/modules/video'

export default async function videoHandler(req, res, next) {
    const { path: filePath, resourceId, bitrate, autoBitrate, resolution, method } = req.body
    const user = req.user as UserData

    const params = {
        filePath,
        resourceId,
        UID: user.UID,
        bitrate:
            typeof bitrate === 'undefined'
                ? Number(settings.get('bitrate')) * 1000000
                : Number(bitrate) * 1000000,
        autoBitrate: typeof autoBitrate === 'undefined' ? settings.get('autoBitrate') : autoBitrate,
        resolution: resolution ? resolution : '1080p',
        method: method ? method : 'transcode',
    }
    try {
        await VideoTaskCenter.singleTask(params)
        res.status(200).end()
    } catch (error) {
        res.status(500).json({ message: '处理失败' })
    }
    // const videoHandler = await handleVideoRequest(params)

    // if (videoHandler.method == 'direct') {
    //     res.json({
    //         src: `/api/v1/video/directPlay/${videoHandler.id}?token=${signAccessToken(user)}`, //id只是凑格式的，目标路径在handler中
    //         type: videoHandler.contentType,
    //     })
    // } else if (videoHandler.method == 'transcode') {
    //     res.json({
    //         src: `/api/v1/video/output/index.m3u8`,
    //         type: videoHandler.contentType,
    //     })
    // }
}
