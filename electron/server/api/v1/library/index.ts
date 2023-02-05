import express from 'express'
import fs from 'fs'
import path from 'path'
import init from '@s/utils/init'
import { getFileType } from '@s/utils'
const router = express.Router()
router.use('/', async (req, res, next) => {
    // console.log('/')
    next()
})
router.get('/old', (req, res, next) => {
    try {
        const library = JSON.parse(fs.readFileSync(path.resolve(init.libraryIndexPath)).toString())
        res.send(library)
    } catch (error) {
        res.status(404).send('未建立媒体库')
    }
})
//文件请求处理
router.use('/poster', async (req, res, next) => {
    let filePath
    if (req.query?.path) {
        filePath = path.resolve(req.query.path as string)
    } else {
        res.status(404).end()
    }
    if ((await getFileType(filePath)) === 'image') {
        try {
            res.sendFile(path.resolve(filePath))
            return
        } catch (error) {
            res.send(error.message)
            next()
        }
    }
})
export default router
