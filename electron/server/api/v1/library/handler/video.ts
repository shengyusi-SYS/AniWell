import settings from '@s/store/settings'
import { users } from '@s/store/users'
import { signAccessToken, verifyToken } from '@s/utils/jwt'
import handleVideoRequest from '@s/modules/handleVideoRequest'
export default async function videoHandler(req, res, next) {
    const { path: filePath, bitrate, autoBitrate, resolution, method } = req.body
    const tokenInfo = verifyToken(req.cookies.refreshToken)
    if (!tokenInfo) return
    const UID = tokenInfo.UID
    const user = users.getUser({ UID })
    if (!user) return

    const params = {
        ...{
            filePath,
            UID,
            bitrate: settings.get('bitrate') * 1000000,
            autoBitrate: settings.get('autoBitrate'),
            resolution: '1080p',
            method: '',
        },
        ...req.body.params,
    }

    const videoHandler = await handleVideoRequest(params)

    if (videoHandler.method == 'direct') {
        res.json({
            src: `/api/v1/video/directPlay/${videoHandler.id}?token=${signAccessToken(user)}`, //id只是凑格式的，目标路径在handler中
            type: videoHandler.contentType,
        })
    } else if (videoHandler.method == 'transcode') {
        res.json({
            src: `/api/v1/video/output/index.m3u8`,
            type: videoHandler.contentType,
        })
    }
}
