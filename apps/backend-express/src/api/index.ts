import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import express from 'express'
const router = express.Router()
import v1 from './v1'

router.use('/v1', v1)

export default router
