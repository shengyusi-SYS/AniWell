import express from 'express'
import VideoTaskCenter from '@s/modules/video'
import subtitles from '@s/store/subtitles'
import paths from '@s/utils/envPath'
import path from 'path'
import zlib from 'zlib'
import { createReadStream } from 'fs'
import compression from 'compression'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
const compressionMw = compression()

const router = express.Router()

// router.use('/hls', VideoTaskCenter.handleRequest)
router.use('/src', (req, res) => {
    return VideoTaskCenter.handleRequest(req, res)
})

router.get('/clearVideoTemp', async (req, res) => {
    await VideoTaskCenter.stopSingleTask(req.query.taskId)
    res.status(200).end()
    return
})

router.get('/sub', compressionMw, async (req, res) => {
    const { id, codec, index, acceptCodec } = req.query
    if (id && typeof id === 'string') {
        try {
            const targetCodec =
                (typeof acceptCodec === 'string' && acceptCodec) ||
                (typeof codec === 'string' && codec) ||
                'webvtt'
            const sub = await subtitles.get({
                id,
                targetCodec,
                index: Number(index) || 0,
            })
            res.header('Content-Type', 'text/plain').send(sub)
        } catch (error) {
            logger.error('sub error', id, codec, index)
            res.status(404).json({ message: '字幕错误', alert: true })
        }
    } else res.status(404).json({ message: '字幕不存在', alert: true })
})
// router.use('/clearVideoTemp', hlsRequestHandler.clearVideoTemp)

router.use('/font', express.static(path.resolve(paths.temp, 'fonts')))

export default router
