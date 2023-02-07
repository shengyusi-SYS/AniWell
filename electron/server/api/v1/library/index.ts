import express from 'express'
import fs from 'fs'
import path, { resolve } from 'path'
import init from '@s/utils/init'
import { getFileType, searchLeaf } from '@s/utils'
import { encode, decode } from 'js-base64'
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

router.get('/:catagory', (req, res, next) => {
    try {
        const catagory = req.params?.catagory
        const reqPath = req.query.itemId
        const range = req.query.range
        if (typeof range === 'string') {
            var start = Number(range.split(',')[0])
            var end = Number(range.split(',')[1])
        }

        const library = JSON.parse(fs.readFileSync(path.resolve(init.libraryIndexPath)).toString())
        console.log(catagory, resolve(decode(reqPath)))
        if (typeof catagory === 'string') {
            if (catagory === 'video' && !reqPath) {
                const result = []
                for (; start < end && start < library.children.length; start++) {
                    const element = library.children[start]
                    result.push(element)
                }
                library.children = result
                res.send(library)
                return
            }
            const search = searchLeaf(library, resolve(decode(reqPath)))
            if (search) {
                const result = []
                for (; start < end && start < search.children.length; start++) {
                    const element = search.children[start]
                    result.push(element)
                }
                search.children = result
                res.send(search)
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
