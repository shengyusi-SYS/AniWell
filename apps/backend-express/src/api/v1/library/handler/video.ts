import settings from '@s/store/settings'
import { users, UserData } from '@s/store/users'
import { signAccessToken, verifyToken } from '@s/utils/jwt'
import VideoTaskCenter from '@s/modules/video'
import { getLibrary } from '@s/store/library'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'

export interface ClientParams {
    libName?: string
    filePath: string
    user?: UserData
    bitrate?: number
    autoBitrate?: boolean
    resolution?: string
    method?: 'direct' | 'transcode'
}

export default async function videoHandler(req, res, next) {
    const { filePath, libName, bitrate, autoBitrate, resolution, method } = req.body as ClientParams

    const user = req.user as UserData

    const params: ClientParams = {
        filePath,
        libName,
        user,
        bitrate:
            bitrate == undefined
                ? Number(settings.transcode.bitrate) * 1000000
                : Number(bitrate) * 1000000,
        autoBitrate: autoBitrate || settings.transcode.autoBitrate,
        resolution: resolution || '1080p',
        method: method || 'transcode',
    }
    try {
        const task = await VideoTaskCenter.singleTask(params)
        console.log(task.src)
        res.status(200).send(task.src)
    } catch (error) {
        logger.error('video', error)
        res.status(500).json({ message: '处理失败', error })
    }
}
