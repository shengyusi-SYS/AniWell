import express from 'express'
import VideoTaskCenter from '@s/modules/video'
import subtitles from '@s/store/subtitles'
const router = express.Router()

// router.use('/hls', VideoTaskCenter.handleRequest)
router.use('/src', (req, res) => {
    return VideoTaskCenter.handleRequest(req, res)
})

router.use('/sub', async (req, res) => {
    const id = req.query.id
    const codec = req.query.codec
    if (id) {
        try {
            const sub = await subtitles.get(id, codec ? codec : 'webvtt')
            res.header('Content-Type', 'text/plain').send(sub.toString())
        } catch (error) {
            res.status(404).json({ message: '字幕错误' })
        }
    } else res.status(404).json({ message: '字幕不存在' })
})
// router.use('/clearVideoTemp', hlsRequestHandler.clearVideoTemp)

export default router
