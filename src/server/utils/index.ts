import { logger, scrapeLogger } from "./logger"
import { rimraf } from "rimraf"
import { EventEmitter } from "events"
import path from "path"
const event = new EventEmitter()
import sevenBin from "7zip-bin"
const pathTo7zip = sevenBin.path7za.replace("app.asar", "app.asar.unpacked")
import Seven from "node-7z"
import { readdir, mkdir, rename } from "fs/promises"
import crypto from "crypto"
import fs from "fs"
import { fileTypeFromFile } from "file-type"
import { Readable } from "stream"
import { TaskProgressController } from "@s/modules/scraper"

//清理空字符串和数组（ffmpeg指令用）
export function clearEmpty(arr: Array<string | Function>) {
    return arr.filter((v) => v.length > 0 || typeof v === "function")
}

function generatePictureUrl(path) {
    return `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(path)}`
}
//MIME type，videojs播放mkv时也要设为'video/mp4'，待研究
function mediaContentType(name) {
    const type = {
        ".mp4": "video/mp4",
        ".mkv": "video/mp4",
        // '.mkv':'video/x-matroska'
    }
    return type[path.extname(name)]
}

//解压fonts压缩包到dest
//竟然不能解压rar，之后修复
export async function extractAndList(packPath: string, dest: string) {
    const fileList = []
    try {
        await new Promise((resolve, reject) => {
            const message = []
            const stream = Seven.extractFull(packPath, dest, {
                recursive: true,
                $bin: pathTo7zip,
            })
            stream.on("data", (data) => {
                message.push(data)
            })
            stream.on("end", function () {
                logger.debug("extractAndList message", message)
                resolve(null)
            })
            stream.on("error", (err) => {
                logger.error("extractAndList error", [err, message])
                reject([err, message])
            })
        })
    } catch (error) {
        logger.error("extractAndList extractFull", packPath, error)
    }
    try {
        await filterDirFile(dest, { fileList, dirList: [] })
    } catch (error) {
        logger.error("extractAndList filterDirFile error", packPath, error)
    }
    logger.debug("extractAndList", pathTo7zip, packPath, dest, fileList)
    return fileList
}

//列出压缩包内容
async function listPack(packPath) {
    return Seven.list(packPath, {
        $bin: pathTo7zip,
    })
}

export function readChunkSync(filePath, { length = 1024, startPosition = 0 }) {
    let buffer = Buffer.alloc(length)
    const fileDescriptor = fs.openSync(filePath, "r")

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
        const hash = crypto.createHash("md5")
        // console.log('start', filePath);
        const chunk = readChunkSync(filePath, { length: 1024 * 1024 * 16, startPosition: 0 })
        const md5 = hash.update(chunk, "utf8").digest("hex")
        // console.log('vidoeHash', filePath);
        scrapeLogger.debug("vidoeHash", filePath)
        return Promise.resolve(md5)
    } catch (error) {
        return Promise.reject("")
    }
}

//异步任务池
class TaskPool {
    tasksQueue = []
    tasksActiveCount = 0
    tasksLimit: number

    constructor(tasksLimit: number) {
        if (tasksLimit < 0) {
            throw new Error("Limit cant be lower than 0.")
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
async function getFileType(filePath: string): Promise<{ mime: string; type: string } | undefined> {
    try {
        const mime = (await fileTypeFromFile(filePath))?.mime
        return { mime, type: mime.split("/")[0] }
    } catch (error) {
        return undefined
    }
}

//深合并
const defaultDeepMergerParams = {
    keyword: "", //处理数组合并时使用，根据每个元素中的关键词属性对应的值判断是否存在
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
                if (typeof exist == "object" && typeof addVal == "object") {
                    deepMerge(exist, addVal, { keyword, depth: depth + 1, depthLimit })
                }
            }
        })
    } else if (
        (toB instanceof Object && addA instanceof Object) ||
        (typeof toB === "object" && typeof addA === "object")
    ) {
        for (const key in addA) {
            const exist = toB[key]
            const addVal = addA[key]
            if (!exist) {
                toB[key] = addVal
            } else {
                if (typeof exist == "object" && typeof addVal == "object") {
                    deepMerge(exist, addVal, { keyword, depth: depth + 1, depthLimit })
                } else if (exist !== addVal) {
                    toB[key] = addVal
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
        input.once("end", resolve)
        input.once("error", reject)
    })
}

export function toNumber<T>(val): T | number {
    const reg = /^(-?\d*\.?\d*)$/g
    if (val === "") {
        return val
    }
    if (typeof val === "string" && reg.test(val)) {
        return Number(val)
    } else return val
}

export function toNumberDeep<T>(obj: T, ignore: string[] = ["level"]): T {
    if (obj instanceof Array) {
        obj.forEach((v, i, a) => {
            if (typeof v === "object") {
                a[i] = toNumberDeep(v, ignore)
            } else if (!ignore.includes(v)) {
                a[i] = toNumber(v)
            }
        })
    } else if (obj instanceof Object) {
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const element = obj[key]
                if (typeof element === "object") {
                    obj[key] = toNumberDeep(element, ignore)
                } else if (!ignore.includes(key)) {
                    obj[key] = toNumber(element)
                }
            }
        }
    }
    return obj
}

export async function filterDirFile(filterDirPath, { fileList, dirList }) {
    logger.debug("filterDirFile start", filterDirPath)
    const progressController: TaskProgressController = this?.progressController
    const curList = (await readdir(filterDirPath)).map((v) => path.resolve(filterDirPath, v))
    const typeResult = await Promise.allSettled(curList.map((v) => readdir(v)))
    const nextDirList = []
    typeResult.forEach((v, i) => {
        if (v.status === "fulfilled") {
            dirList.push(curList[i])
            nextDirList.push(curList[i])
        } else fileList.push(curList[i])
    })

    if (progressController) {
        progressController.setCurrent({ currentName: filterDirPath, currentId: fileList.length })
    } else if (fileList.length % 10 === 0) {
        logger.debug(fileList.length)
    }

    return Promise.allSettled(
        nextDirList.map((v) => filterDirFile.call(this, v, { fileList, dirList })),
    )
}

export const dotGet = (obj: object, key: string) => {
    const args = key.split(".")
    return args.reduce((pre, val, ind, arr) => {
        if (pre == undefined) return pre
        return pre[val]
    }, obj)
}

export const bufferToStream = (buffer: Buffer) => {
    const stream = new Readable()
    stream._read = () => {}
    stream.push(buffer)
    stream.push(null)
    return stream
}

export const screenObject = <T extends Object>(target: T, ref: string[] | undefined) => {
    return ref == undefined
        ? target
        : new Proxy(target, {
              get(target, key) {
                  if (typeof key === "string") {
                      if (ref.includes(key)) {
                          return Reflect.get(target, key)
                      } else return undefined
                  } else return Reflect.get(target, key)
              },
              set(target, key, value) {
                  if (typeof key === "string") {
                      if (ref.includes(key)) {
                          return Reflect.set(target, key, value)
                      } else return true
                  } else return Reflect.set(target, key, value)
              },
              ownKeys(target) {
                  return ref
              },
          })
}

export {
    generatePictureUrl,
    mediaContentType,
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
export { readDirTree, readDirTreeSync, appedDirTree, searchLeaf, Tree } from "./tree"
export * from "./media/info"
