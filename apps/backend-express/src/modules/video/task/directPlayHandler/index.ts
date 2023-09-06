import path from 'path'
import fs from 'fs'
import { generatePictureUrl, mediaContentType } from '@s/utils'
import { stat } from 'fs/promises'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import { VideoHandler } from '@s/modules/video/task'
import { VideoInfo } from '../getVideoInfo'

//处理直接播放
export default class DirectPlayHandler implements VideoHandler {
    filePath
    contentType
    constructor() {}
    public async init({ videoInfo }: { videoInfo: VideoInfo }) {
        this.filePath = videoInfo.filePath
        this.contentType = mediaContentType(this.filePath) || 'video/mp4'
        // return this
    }
    /**
     * async directPlay
     */
    public async handle(req, res) {
        try {
            logger.debug('directPlayHandler handler /api/localFile/directPlay', 'start')
            const fileState = await stat(this.filePath)
            const fileSize = fileState.size
            const range = req.headers.range as undefined | string
            logger.info('directPlayHandler handler /api/localFile/directPlay', this.filePath, range)

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
                const file = fs.createReadStream(this.filePath, { start, end })
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': this.contentType,
                }

                res.writeHead(206, head)
                file.pipe(res)
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': this.contentType,
                }
                res.writeHead(200, head)
                fs.createReadStream(this.filePath).pipe(res)
            }

            logger.info('directPlayHandler handler /api/localFile/directPlay', 'end', range)
        } catch (error) {
            logger.error('directPlayHandler handler /api/localFile/directPlay', error)
        }
    }
    /**
     * stop
     */
    public async stop() {
        return Promise.resolve()
    }
}
