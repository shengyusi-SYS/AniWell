import { logger } from '@s/utils/logger'
import express from 'express'
const router = express.Router()
import v1 from './v1'
import localFile from './localFile'
//会随新ui换成多级路由

router.use('/v1', v1)

router.use('/localFile', localFile)

export default router
