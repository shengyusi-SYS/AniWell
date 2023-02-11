import express from 'express'
import VideoTaskCenter from '@s/modules/video'
const router = express.Router()

// router.use('/hls', VideoTaskCenter.handleRequest)
router.use('/src', (req, res) => {
    return VideoTaskCenter.handleRequest(req, res)
})

router.use('/sub', (req, res) => {
    return VideoTaskCenter.handleRequest(req, res)
})
// router.use('/clearVideoTemp', hlsRequestHandler.clearVideoTemp)

export default router
