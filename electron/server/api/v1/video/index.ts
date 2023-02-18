import express from 'express'
import VideoTaskCenter from '@s/modules/video'
import subtitles from '@s/store/subtitles'
import paths from '@s/utils/envPath'
import path from 'path'
import zlib from 'zlib'
import { createReadStream } from 'fs'
import compression from 'compression'

const router = express.Router()

// router.use('/hls', VideoTaskCenter.handleRequest)
router.use('/src', (req, res) => {
    return VideoTaskCenter.handleRequest(req, res)
})

router.use('/sub', async (req, res) => {
    const { id, codec, index } = req.query
    if (id) {
        try {
            const sub = await subtitles.get({
                id,
                targetCodec: codec || 'webvtt',
                index: index || null,
            })

            res.header('Content-Type', 'text/plain')
                // .header('Content-Encoding', 'br')
                .send(
                    // zlib.brotliCompressSync(sub)
                    sub,
                )
        } catch (error) {
            res.status(404).json({ message: '字幕错误' })
        }
    } else res.status(404).json({ message: '字幕不存在' })
})
// router.use('/clearVideoTemp', hlsRequestHandler.clearVideoTemp)

router.use(
    '/font',
    compression(),
    (req, res, next) => {
        res.header('Cache-Control', `max-age=${3600 * 24 * 30},public`)
        next()
    },
    express.static(path.resolve(paths.temp, 'fonts')),
)

export default router
