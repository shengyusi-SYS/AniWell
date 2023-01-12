import path from 'path'
import fs from 'fs'
import { generatePictureUrl, mediaContentType } from '@s/utils'
import { stat } from 'fs/promises'
import { logger } from '@s/utils/logger'

let _this
//处理直接播放
class DirectPlayHandler {
    filePath
    contentType
    constructor() {}
    init(videoInfo) {
        this.filePath = videoInfo.filePath
        this.contentType = mediaContentType(this.filePath)
        _this = this
        console.log(_this)
    }
    directPlay = async (req, res) => {
        try {
            logger.debug('directPlayHandler handler /api/localFile/directPlay', 'start')
            const filePath = _this.filePath
            const fileState = await stat(filePath)
            const fileSize = fileState.size
            const range = req.headers.range
            logger.info('directPlayHandler handler /api/localFile/directPlay', filePath, range)

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-')
                const start = parseInt(parts[0], 10)
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

                if (start >= fileSize) {
                    res.status(416).send(
                        'Requested range not satisfiable\n' + start + ' >= ' + fileSize,
                    )
                    return
                }

                const chunksize = end - start + 1
                const file = fs.createReadStream(filePath, { start, end })
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': _this.contentType,
                }

                res.writeHead(206, head)
                file.pipe(res)
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': _this.contentType,
                }
                res.writeHead(200, head)
                fs.createReadStream(filePath).pipe(res)
            }

            logger.info('directPlayHandler handler /api/localFile/directPlay', 'end', range)
        } catch (error) {
            logger.error('directPlayHandler handler /api/localFile/directPlay', error)
        }
    }
}
const directPlayHandler = new DirectPlayHandler()
export default directPlayHandler
