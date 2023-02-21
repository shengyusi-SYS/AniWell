import { logger, changeLevel } from '@s/utils/logger'
import fs from 'fs'
import path from 'path'
import { readFile, writeFile } from 'fs/promises'
import init from '@s/utils/init'
const { libraryIndex } = init
import settings from '@s/store/settings'
import { generatePictureUrl, searchLeaf, deepMerge, Tree } from '@s/utils'
import got from 'got'
import express from 'express'
import { CookieJar } from 'tough-cookie'
const cookieJar = new CookieJar()
import handleVideoRequest from '@s/modules/handleVideoRequest'
import { librarySettingsList, updateLibrarySettings } from '@s/modules/mediaLibrary/librarySettings'
import { initMediaLibrary, cleanLibrary, MediaLeaf } from '@s/modules/mediaLibrary'
import dandanplayScraper from '@s/modules/mediaLibrary/dandanplayScraper'
const router = express.Router()
import hlsRequestHandler from '@s/modules/handleVideoRequest/hlsRequestHandler'
import directPlayHandler from '@s/modules/handleVideoRequest/directPlayHandler'

let SID: string
let cookieTimer: NodeJS.Timeout
let checkCookie = true
const bannedSIDs: string[] = []

//权限验证预处理
router.use('/', (req, res, next) => {
    // logger.debug('/api',req.path);
    // console.log('------------', req.path)

    try {
        if (
            req.path == '/v2/auth/login' ||
            /^\/v1/.test(req.path) ||
            /^\/localFile\/output\//i.test(req.path)
        ) {
            // logger.debug('/v2/auth/login', req.headers)
            next()
        } else if (!req.cookies && !req.query.cookie) {
            throw new Error('Fails.')
        } else {
            let newSID
            if (req.cookies?.SID) {
                newSID = req.cookies.SID
            } else if (req.query?.cookie) {
                newSID = (req.query.cookie as string).replace('SID=', '')
            } else {
                throw new Error('Fails.')
            }

            if (bannedSIDs.includes(newSID)) {
                logger.error('/api', 'bannedSIDs')
                throw new Error('Fails.')
            } else if (SID != newSID) {
                checkCookie = true
                SID = newSID
                cookieJar.setCookieSync(`SID=${newSID}`, settings.get('qbHost'))
            }
            next()
        }
    } catch (error) {
        if (req.path != '/v2/sync/maindata') {
            logger.error('/api', req.path, req.headers, req.cookies, error)
        }
        res.status(403).send(error)
    }
})

//权限验证
router.use('/localFile', async (req, res, next) => {
    try {
        res.header('Access-Control-Allow-Origin', '*')
        if (settings.get('share') && /^\/localFile\/output\//i.test(req.path)) {
            next()
            return
        }
        if (/^\/v1/.test(req.path)) {
            next()
            return
        }
        if (checkCookie) {
            logger.info('/api/localFile', 'check')
            const result = (
                await got({
                    url: `${settings.get('qbHost')}/api/v2/auth/login`,
                    method: 'POST',
                    cookieJar,
                })
            ).body
            if (result == 'Ok.') {
                checkCookie = false
                clearTimeout(cookieTimer)
                cookieTimer = setTimeout(() => {
                    checkCookie = true
                }, 30 * 60 * 1000)
                next()
            } else {
                logger.info('/api/localFile', 'banned', SID)
                bannedSIDs.push(SID)
                throw new Error('Fails.')
            }
        } else {
            next()
        }
    } catch (error) {
        logger.error('/api/localFile', error)
        res.status(403).send(error)
    }
})

const maindataCache: { torrents: object } = { torrents: {} }
let videoHandler
router.use('/localFile', (req, res, next) => {
    if (req.cookies?.SID) {
        SID = req.cookies.SID
    } else if (req.query?.cookie) {
        SID = (req.query.cookie as string).replace('SID=', '')
    }
    next()
})
router.use('/localFile/output', hlsRequestHandler.output)
router.use('/localFile/clearVideoTemp', hlsRequestHandler.clearVideoTemp)
router.use('/localFile/directPlay', directPlayHandler.directPlay)
//连接状态测试，返回服务器配置项
router.use('/localFile/checkFileServer', (req, res) => {
    res.send(settings.list())
})
//获取媒体库配置项
router.use('/localFile/librarySettings', (req, res) => {
    res.send(librarySettingsList)
})
//更新媒体库设定
router.use('/localFile/updateLibrarySettings', (req, res) => {
    const result = updateLibrarySettings(req.body)
    if (result) {
        res.send({ success: true })
    } else {
        res.send({
            error: true,
            errorMessage: '路径错误',
        })
    }
})
//更新指定媒体库
router.use('/localFile/updateLibrary', async (req, res) => {
    const { libraryPath, libraryName } = req.body
    if (!searchLeaf(libraryIndex, libraryPath)) {
        res.send({
            success: false,
            errorMessage: '媒体库不存在',
        })
        return
    } else {
        res.send({ success: true })
    }
    await initMediaLibrary(libraryPath, libraryName, true)
    await cleanLibrary()
    logger.info('/updateLibrary end')
})
//更新指定文件夹
router.use('/localFile/updateDir', async (req, res) => {
    const { dirPath } = req.body
    // if (!searchLeaf(libraryIndex,dirPath)) {
    //     res.send({
    //         error: true,
    //         errorMessage: '不存在,请更新媒体库'
    //     })
    //     return
    // }else{
    res.send('Ok.')
    // }
    await dandanplayScraper(dirPath, searchLeaf(libraryIndex, dirPath), { full: true, depth: 0 })
    await writeFile(init.libraryIndexPath, JSON.stringify(libraryIndex, null, '\t'))
    logger.info('/updateDir end')
})

//更新配置项
router.use('/localFile/changeFileServerSettings', async (req, res) => {
    const data: object = req.body
    try {
        settings.update(data)
        logger.info('/changeFileServerSettings', '已更新配置', settings.store)
        changeLevel()
        res.send('Ok.')
    } catch (error) {
        logger.error('/changeFileServerSettings', error)
        res.send('Fails.')
    }
})

// router.use('/localFile/killFFmpeg', (req, res, next) => {
//     if (FFmpegProcess) {
//         // spawn('taskkill',['-PID',FFmpegProcess.pid,'-F'])
//         kill(FFmpegProcess.pid, 'SIGKILL')
//         logger.debug('debug',FFmpegProcess);
//     }
//     res.send('Ok.')
// })

//hls地址生成
router.use('/localFile/videoSrc', (req, res, next) => {
    // const path = req.headers.referer.split(':')
    if (videoHandler.method == 'direct') {
        res.send({
            src: `/api/old/localFile/directPlay/${videoHandler.id}?cookie=SID=${encodeURIComponent(
                SID,
            )}`, //id只是凑格式的，目标路径在handler中
            type: videoHandler.contentType,
        })
    } else if (videoHandler.method == 'transcode') {
        res.send({
            src: `/api/old/localFile/output/index.m3u8`,
            type: videoHandler.contentType,
        })
    }
    // logger.debug('debug','src', fileRootPath);
})

router.use('/localFile/library', (req, res, next) => {
    try {
        const library = JSON.parse(fs.readFileSync(path.resolve(init.libraryIndexPath)).toString())
        res.send(library)
    } catch (error) {
        res.status(404).send('未建立媒体库')
    }
})

//文件请求处理
router.use('/localFile/getFile', async (req, res, next) => {
    let filePath
    const formatList = {
        text: ['txt'],
        video: ['mkv', 'mp4', 'flv', 'ts', 'm3u8', 'mov', 'avi'],
        picture: ['jpg', 'png'],
        audio: ['mp3', 'wav', 'flac'],
    }
    let fileType
    const body = req.body
    if (body && body.rootPath && (body.name || body.label)) {
        filePath = path.resolve(body.rootPath, body.name ? body.name : body.label ? body.label : '')
        var suffix = path.extname(filePath).replace('.', '')
        for (const key in formatList) {
            if (formatList[key].includes(suffix)) {
                fileType = key
            }
        }
    }
    if (req.query?.path) {
        fileType = req.query.type
        filePath = path.resolve(req.query.path as string)
    }
    logger.debug('/getFile', req.query)
    try {
        if (fileType == 'text') {
            readFile(path.resolve(filePath)).then((result) => {
                res.send(result)
            })
        } else if (fileType == 'video') {
            const params = {
                ...{
                    //测试，待删
                    filePath,
                    suffix,
                    SID,
                    bitrate: settings.transcode.bitrate * 1000000,
                    autoBitrate: settings.transcode.autoBitrate,
                    resolution: '1080p',
                    method: '', //测试，待删
                }, //测试，待删
                ...body.params, //测试，待删
            }
            videoHandler = await handleVideoRequest(params)
            // videoHandler(app)
            res.send('Ok.')
        } else if (fileType == 'picture') {
            res.sendFile(path.resolve(filePath))
        } else if (fileType == 'audio') {
            readFile(path.resolve(filePath)).then((result) => {
                res.send(result)
            })
        } else {
            throw new Error('暂不支持')
        }
        return
    } catch (error) {
        res.send(error.message)
        next()
    }
})

router.use('/localFile/api/v2/sync/maindata', async (req, res, next) => {
    got({
        url: `${settings.get('qbHost')}/api/v2/sync/maindata?rid=${req.query.rid}`,
        method: 'get',
        cookieJar,
    })
        .then((result) => {
            const newData = JSON.parse(result.body)
            res.header('Content-Type', 'application/json')
            //处理删减
            if (newData.torrents_removed) {
                newData.torrents_removed.forEach((hash) => {
                    delete maindataCache.torrents[hash]
                })
            } else if (newData.full_update) {
                //处理完全更新
                const update = false
                //附加媒体信息，半废中
                for (const hash in newData.torrents) {
                    if (newData.torrents[hash].content_path == newData.torrents[hash].save_path) {
                        // newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.collections[hash]))
                        // newData.torrents[hash].mediaInfo.poster = `/getFile/img.jpg?type=picture&path=${encodeURIComponent(newData.torrents[hash].mediaInfo.poster)}`
                    } else {
                        // console.log(newData.torrents[hash]);
                        const mediaPath = newData.torrents[hash].content_path
                        let mediaInfo: MediaLeaf | false = searchLeaf(libraryIndex, mediaPath)
                        if (mediaInfo) {
                            ;(mediaInfo as MediaLeaf) = JSON.parse(JSON.stringify(mediaInfo))
                            delete mediaInfo.children
                            newData.torrents[hash].mediaInfo = mediaInfo
                            if (mediaInfo.poster) {
                                newData.torrents[hash].mediaInfo.poster = generatePictureUrl(
                                    mediaInfo.poster,
                                )
                            }
                        }
                    }
                }
                deepMerge(maindataCache, newData)
            } else {
                deepMerge(maindataCache, newData)
            }
            res.send(newData)
        })
        .catch((err) => {
            logger.error('/api/v2/sync/maindata', err)
        })
})

// router.use("/api/v2/sync/maindata", proxy({
//     ...proxySettings,
//     selfHandleResponse: true,
//     onProxyRes:(proxyRes, req, res)=>{
//         logger.debug('debug',proxyRes.body);
//         proxyRes.on('data', function (chunk) {
//             logger.debug('debug',chunk.toString());
//         })
//     }
// }));
router.use('/localFile/api/v2/torrents/files', (req, res, next) => {
    const hash = req.body.hash
    // let form = new FormData()
    // form.append('hash', hash)
    let file
    got({
        url: `${settings.get('qbHost')}/api/v2/torrents/files`,
        method: 'post',
        form: { hash: hash },
        cookieJar,
    })
        .then((result) => {
            file = JSON.parse(result.body)
            file.forEach((v) => {
                const fullPath = path.resolve(maindataCache.torrents[hash].save_path, v.name)
                // console.log(libraryIndex.children.find(v=>fullPath.includes(v.path)),fullPath);
                const info = searchLeaf(libraryIndex, fullPath)
                if (info) {
                    v.mediaInfo = JSON.parse(JSON.stringify(info))
                    if (v.mediaInfo.poster) {
                        v.mediaInfo.poster = generatePictureUrl(v.mediaInfo.poster)
                    }
                    // v.mediaInfo.seasonPoster = generatePictureUrl(v.mediaInfo.seasonPoster)
                }
            })
            // file.forEach(v => {
            //     let fullPath = path.resolve(maindataCache.torrents[hash].save_path, v.name)
            //     console.log(libraryIndex.children.find(v=>fullPath.includes(v.path)),fullPath);
            //     let info =  searchLeaf(libraryIndex.children.find(v=>fullPath.includes(v.path)),fullPath)
            //     if (libraryIndex.episodes[fullPath]) {
            //         v.mediaInfo = JSON.parse(JSON.stringify(info))
            //         v.mediaInfo.poster = generatePictureUrl(v.mediaInfo.poster)
            //         // v.mediaInfo.seasonPoster = generatePictureUrl(v.mediaInfo.seasonPoster)
            //     }
            // })
            res.send(file)
        })
        .catch((e) => logger.error('error', e))
})
// next()
// router.use("/api/v2/torrents/files",express.urlencoded());
// router.use("/api/v2/torrents/files", proxy({
//     ...proxySettings,
//     onProxyRes:(proxyRes, req, res)=>{
//         logger.debug('debug',proxyRes.body,proxyRes.data,proxyRes.params,req.query);
//         // logger.debug('debug',proxyRes);
//         // res.send(proxyRes)
//         // proxyRes.on('data', function (chunk) {
//         //     logger.debug('debug',chunk.toString());
//         // })
//     }
// }));
// proxySettings.changeOrigin = true
export default router
