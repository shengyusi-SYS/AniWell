import express from 'express'
import hlsRequestHandler from '@s/modules/handleVideoRequest/hlsRequestHandler'
import directPlayHandler from '@s/modules/handleVideoRequest/directPlayHandler'
const router = express.Router()

router.use('/output', hlsRequestHandler.output)
router.use('/clearVideoTemp', hlsRequestHandler.clearVideoTemp)
router.use('/directPlay', directPlayHandler.directPlay)

export default router
