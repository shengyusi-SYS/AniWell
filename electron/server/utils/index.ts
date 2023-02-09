import settings from '@s/store/settings'
import { logger, scrapeLogger } from './logger'
import rimraf from 'rimraf'
import { EventEmitter } from 'events'
import path from 'path'
const event = new EventEmitter()
import sevenBin from '7zip-bin'
const pathTo7zip = sevenBin.path7za
import Seven from 'node-7z'
import { readdir, mkdir, rename } from 'fs/promises'
import crypto from 'crypto'
import fs from 'fs'

//清理空字符串和数组（ffmpeg指令用）
function cleanNull(arr) {
    const temp = []
    arr.forEach((v) => {
        if (v.length > 0 || typeof v == 'function') {
            temp.push(v)
        }
    })
    return temp
}

function generatePictureUrl(path) {
    return `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(path)}`
}
//MIME type，videojs播放mkv时也要设为'video/mp4'，待研究
function mediaContentType(name) {
    const type = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/mp4',
        // '.mkv':'video/x-matroska'
    }
    return type[path.extname(name)]
}

//解压同路径下的fonts压缩包到fontsDir
async function extractFonts(packPath, fontsDir?: string) {
    if (!fontsDir) {
        fontsDir = path.resolve(settings.get('tempPath'), 'fonts')
    }
    logger.debug('utils extractFonts start', fontsDir)
    try {
        await new Promise((resolve, reject) => {
            rimraf(fontsDir, (err) => resolve(null))
        })
        await mkdir(fontsDir)
    } catch (error) {}
    await new Promise((resolve, reject) => {
        const stream = Seven.extractFull(packPath, fontsDir, {
            recursive: true,
            $bin: pathTo7zip,
        })
        stream.on('end', function () {
            resolve(null)
        })
        stream.on('error', (err) => resolve(err))
    })
    //检查是否有子文件夹嵌套，只检查一层，多了不干
    let dirContent = await readdir(fontsDir)
    if (dirContent.length == 1) {
        const fontsList = []
        const tempDir = path.join(fontsDir, dirContent[0])
        dirContent = await readdir(tempDir)
        dirContent.forEach((v) => {
            fontsList.push(
                rename(path.join(tempDir, v), path.join(fontsDir, v)).catch((e) =>
                    Promise.resolve(),
                ),
            )
        })
        await Promise.all(fontsList)
    }
}

//列出压缩包内容
function listPack(packPath) {
    return Seven.list(packPath, {
        $bin: pathTo7zip,
    })
}

//计算视频hash，弹弹play模式，废弃，异步模式会导致读取变成小文件随机读取，效率极低
async function vidoeHashS(filePath) {
    const hash = crypto.createHash('md5')
    return await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { end: 1024 * 1024 * 16 - 1 })
        stream.on('data', (chunk) => {
            hash.update(chunk, 'utf8')
        })
        stream.on('end', () => {
            const md5 = hash.digest('hex')
            resolve(md5)
        })
    })
}

export function readChunkSync(filePath, { length = 1024, startPosition = 0 }) {
    let buffer = Buffer.alloc(length)
    const fileDescriptor = fs.openSync(filePath, 'r')

    try {
        const bytesRead = fs.readSync(fileDescriptor, buffer, {
            length,
            position: startPosition,
        })

        if (bytesRead < length) {
            buffer = buffer.subarray(0, bytesRead)
        }

        return buffer
    } finally {
        fs.closeSync(fileDescriptor)
    }
}

//异步函数，但是同步化的读取hash
async function vidoeHash(filePath) {
    try {
        const hash = crypto.createHash('md5')
        // console.log('start', filePath);
        const chunk = readChunkSync(filePath, { length: 1024 * 1024 * 16, startPosition: 0 })
        const md5 = hash.update(chunk, 'utf8').digest('hex')
        // console.log('vidoeHash', filePath);
        scrapeLogger.debug('vidoeHash', filePath)
        return Promise.resolve(md5)
    } catch (error) {
        return Promise.reject('')
    }
}

//异步任务池
class TaskPool {
    tasksQueue = []
    tasksActiveCount = 0
    tasksLimit: number

    constructor(tasksLimit: number) {
        if (tasksLimit < 0) {
            throw new Error('Limit cant be lower than 0.')
        }
        this.tasksQueue = []
        this.tasksActiveCount = 0
        this.tasksLimit = tasksLimit
    }

    registerTask(handler) {
        this.tasksQueue = [...this.tasksQueue, handler]
        this.executeTasks()
    }

    executeTasks() {
        while (this.tasksQueue.length && this.tasksActiveCount < this.tasksLimit) {
            const task = this.tasksQueue[0]
            this.tasksQueue = this.tasksQueue.slice(1)
            this.tasksActiveCount += 1

            task()
                .then((result) => {
                    this.tasksActiveCount -= 1
                    this.executeTasks()
                    return result
                })
                .catch((err) => {
                    this.tasksActiveCount -= 1
                    this.executeTasks()
                    throw err
                })
        }
    }

    task(handler): Promise<unknown> {
        return new Promise((resolve, reject) =>
            this.registerTask(() => handler().then(resolve).catch(reject)),
        )
    }
}

//获取文件类型
async function getFileType(filePath) {
    //新版file-type的package.json中将默认导出设为浏览器版，vite编译时不能正确引入node版，暂未找到其它解决方案
    const { fromFile } = await import('file-type')
    try {
        return (await fromFile(filePath)).mime.split('/')[0]
    } catch (error) {
        return false
    }
}

//深合并
const defaultDeepMergerParams = {
    keyword: '', //处理数组合并时使用，根据每个元素中的关键词属性对应的值判断是否存在
    depth: 0,
    depthLimit: 0,
}
const deepMerge: <T>(
    toB: T,
    addA: T,
    params?: { keyword?: string; depth?: number; depthLimit?: number },
) => T = (toB, addA, params = defaultDeepMergerParams) => {
    const { keyword, depth, depthLimit } = { ...defaultDeepMergerParams, ...params }
    if (!(depthLimit == 0) && depth >= depthLimit) {
        return toB
    }
    if (toB instanceof Object && addA instanceof Object) {
        if (toB instanceof Array && addA instanceof Array) {
            addA.forEach((v) => {
                const addVal = v
                let exist
                if (keyword) {
                    exist = toB.find((val) => val[keyword] === v[keyword])
                } else exist = toB.find((val) => val === v)
                if (!exist) {
                    toB.push(addVal)
                } else {
                    if (typeof exist == 'object' && typeof addVal == 'object') {
                        deepMerge(exist, addVal, { keyword, depth: depth + 1, depthLimit })
                    }
                }
            })
        } else {
            for (const key in addA) {
                const exist = toB[key]
                const addVal = addA[key]
                if (!exist) {
                    toB[key] = addVal
                } else {
                    if (typeof exist == 'object' && typeof addVal == 'object') {
                        deepMerge(exist, addVal, { keyword, depth: depth + 1, depthLimit })
                    } else if (exist !== addVal) {
                        toB[key] = addVal
                    }
                }
            }
        }
    }
    return toB
}

async function copyFile(oldPath, newPath) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(oldPath)
        const output = fs.createWriteStream(newPath)
        input.pipe(output)
        input.once('end', resolve)
        input.once('error', reject)
    })
}

export {
    cleanNull,
    generatePictureUrl,
    mediaContentType,
    extractFonts,
    listPack,
    vidoeHash,
    getFileType,
    deepMerge,
    copyFile,
    Seven,
    event,
    rimraf,
    TaskPool,
}
export { readDirTree, readDirTreeSync, appedDirTree, searchLeaf, Tree } from './tree'
