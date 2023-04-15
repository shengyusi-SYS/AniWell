import express from 'express'
import fs, { accessSync } from 'fs'
import path, { join, resolve } from 'path'
import { getFileType, searchLeaf } from '@s/utils'
import { encode, decode } from 'js-base64'
import { access, stat } from 'fs/promises'
import videoHandler from './handler/video'
import compression from 'compression'
import { logger } from '@s/utils/logger'
import paths from '@s/utils/envPath'
import library, { getLibrary, MapResult, MapRule } from '@s/store/library'
import shuffle from 'lodash/shuffle'
import { orderBy } from 'lodash'
import ScraperCenter, { Scraper, ScraperConfig } from '@s/modules/scraper'

const router = express.Router()

router.use('/', async (req, res, next) => {
    // console.log(req.path, req.query)
    next()
})

export type sortBy =
    | 'path'
    | 'title'
    | 'id'
    | 'order'
    | 'rank'
    | 'like'
    | 'add'
    | 'air'
    | 'creat'
    | 'update'
    | 'change'
export interface LibQuery {
    libName?: string
    path?: string
    sort?: Array<'asc' | 'desc'>
    sortBy?: Array<sortBy> | 'random'
    range?: string
}
router.get('/lib', compression(), async (req, res, next) => {
    const { libName, sort, sortBy, range = '0,20', path } = req.query as unknown as LibQuery

    const lib = await getLibrary(libName, path)
    logger.debug([
        '/lib',
        lib,
        libName,
        sort,
        sortBy,
        sortBy instanceof Array && sort instanceof Array,
        range,
        path,
    ])
    if (!lib) {
        res.status(404).json({ message: '未建立媒体库', alert: true })
        return
    }

    lib.total = lib.children.length

    if (sortBy) {
        if (sortBy instanceof Array && sort instanceof Array) {
            lib.children = orderBy(lib.children, sortBy, sort)
        } else if (sortBy === 'random') {
            lib.children = shuffle(lib.children)
        } else {
            res.status(400).json({ message: '参数错误', alert: true })
            return
        }
    }

    if (typeof range === 'string') {
        const start = Number(range.split(',')[0])
        const end = Number(range.split(',')[1])
        if (typeof start === 'number' && typeof end === 'number') {
            const content = lib.children.slice(start, end)
            lib.children = content
        }
    }

    // console.log(
    //     lib.children.map((v) => {
    //         try {
    //             if (v.poster) {
    //                 accessSync(v.poster)
    //                 return '+++' + v.poster
    //             }
    //             return '000' + v.poster
    //         } catch (error) {
    //             return '---' + v.poster
    //         }
    //     }),
    // )

    res.json(lib)
})

//文件请求处理
router.use('/poster', async (req, res, next) => {
    let filePath
    if (req.query?.path && req.query?.path != 'undefined') {
        filePath = path.resolve(req.query.path as string)
    } else {
        res.status(404).json({ message: '需要路径' })
        return
    }
    try {
        if ((await getFileType(filePath))?.type === 'image') {
            try {
                res.sendFile(path.resolve(filePath))
                return
            } catch (error) {
                res.status(404).json({})
                return
            }
        }
    } catch (error) {
        res.status(404).json({ message: '资源错误' })
    }
})

interface itemQuery {
    display: 'video' | ''
    libName: string
    filePath: string
}
router.post('/item', async (req, res, next) => {
    logger.info('/item', req.body)
    const { display, libName, filePath } = req.body as itemQuery

    const itemPath = resolve(filePath)

    try {
        await access(itemPath)
    } catch (error) {
        res.status(400).json({ message: '资源文件不存在', alert: true })
    }

    try {
        if (display === 'video') {
            await videoHandler(req, res, next)
        } else res.status(500).json({ message: '无对应处理程序', alert: true })
    } catch (error) {
        logger.error('/library/item', error)
        res.status(500).json({ message: '处理失败', alert: true })
    }
})

router.get('/manager', async (req, res) => {
    const libraryList = Object.values(library).map((v) => ({
        name: v.name,
        rootPath: v.rootPath,
        category: v.category,
        mapFile: v.mapFile,
        mapDir: v.mapDir,
        config: v.config,
    }))
    res.json(libraryList)
})

router.post('/manager', async (req, res) => {
    const scraperConfig: ScraperConfig = req.body
    if (!scraperConfig.name || scraperConfig.name === 'overview') {
        res.status(400).json({ error: '资源库名称错误', alert: true })
        return
    }
    if (!['anime', 'video'].includes(scraperConfig.category)) {
        res.status(400).json({ error: '此类别无可用刮削器', alert: true })
    }
    try {
        await access(scraperConfig.rootPath)
    } catch (error) {
        res.status(400).json({ error: '根路径错误', alert: true })
    }
    logger.info(scraperConfig, 'req build library by ', req.user)
    ScraperCenter.task(() => new Scraper().build(scraperConfig))
    res.end()
})

router.delete('/manager', async (req, res) => {
    const libName = req.body.libName
    delete library[libName]
    logger.warn('!!!', req.user, 'deleted', libName)
    res.end()
})

//更新library，可选定更新范围
router.patch('/manager', async (req, res) => {
    const { libName, targetPath }: { libName: string; targetPath: string } = req.body
    console.log(libName, targetPath)
    ScraperCenter.task(() => new Scraper().update(libName, targetPath))
    res.end()
})

//修复library，建立出错时使用
router.put('/manager', async (req, res) => {
    const { libName } = req.body
    ScraperCenter.task(() => new Scraper().mount(libName).repair())
    res.end()
})

interface reqEditMapRule {
    libName: string
    mapFile?: MapRule
    mapDir?: MapRule
}
router.put('/mapRule', async (req, res) => {
    const { libName, mapFile, mapDir } = req.body as reqEditMapRule
    console.log([libName, mapFile, mapDir])

    if (library[libName] == undefined) {
        res.status(400).json({ error: '资源库不存在', alert: true })
    }
    if (mapFile && library[libName]?.mapFile) {
        library[libName].mapFile = mapFile
    }
    if (mapDir && library[libName]?.mapDir) {
        library[libName].mapDir = mapDir
    }
    res.end()
})

export default router
