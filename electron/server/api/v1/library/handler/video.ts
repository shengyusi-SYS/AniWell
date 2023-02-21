import settings from '@s/store/settings'
import { users, UserData } from '@s/store/users'
import { signAccessToken, verifyToken } from '@s/utils/jwt'
import VideoTaskCenter from '@s/modules/video'

export interface ClientParams {
    filePath?: string
    resourceId?: string
    user?: UserData
    bitrate?: number
    autoBitrate?: boolean
    resolution?: string
    method?: string
}

export default async function videoHandler(req, res, next) {
    const { filePath, resourceId, bitrate, autoBitrate, resolution, method } = req.body
    const user = req.user as UserData

    const params: ClientParams = {
        filePath,
        resourceId,
        user,
        bitrate:
            typeof bitrate === 'undefined'
                ? Number(settings.transcode.bitrate) * 1000000
                : Number(bitrate) * 1000000,
        autoBitrate:
            typeof autoBitrate === 'undefined' ? settings.transcode.autoBitrate : autoBitrate,
        resolution: resolution ? resolution : '1080p',
        method: method ? method : 'transcode',
    }
    try {
        const task = await VideoTaskCenter.singleTask(params)
        console.log(task.src)
        res.status(200).send(task.src)
    } catch (error) {
        res.status(500).json({ message: '处理失败', error })
    }
}
