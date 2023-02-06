import express from 'express'
import fs from 'fs'
import path from 'path'
import init from '@s/utils/init'
import { getFileType, searchLeaf } from '@s/utils'
const router = express.Router()
router.use('/', async (req, res, next) => {
    // console.log(req.path, req.query)
    next()
})

router.get('/old', (req, res, next) => {
    try {
        const library = JSON.parse(fs.readFileSync(path.resolve(init.libraryIndexPath)).toString())
        res.send(library)
        return
    } catch (error) {
        res.status(404).send('未建立媒体库')
        return
    }
})

router.get('/', (req, res, next) => {
    try {
        const catagory = req.query?.catagory
        const library = JSON.parse(fs.readFileSync(path.resolve(init.libraryIndexPath)).toString())
        console.log(catagory, req.query)
        if (typeof catagory === 'string') {
            if (catagory === 'old') {
                // delete library.children
                res.send(library)
                return
            }
            const result = searchLeaf(library, catagory)
            if (result) {
                // delete result.children
                res.send(result)
            } else {
                res.status(404).send('不存在')
            }
        } else {
            res.status(404).send('参数错误')
        }
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
        res.status(404).send('fail').end()
    }
    if ((await getFileType(filePath)) === 'image') {
        try {
            res.sendFile(path.resolve(filePath))
            return
        } catch (error) {
            res.status(404).send('fail').end()

            return
        }
    }
})

router.get('/item', async (req, res, next) => {
    const itemId = req?.query?.itemId
    if (itemId) {
        res.json()
    }
})
export default router
