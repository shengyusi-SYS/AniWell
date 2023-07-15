import path, { basename, dirname, extname, resolve } from "path"
import { readFile, readdir, stat, writeFile, access } from "fs/promises"
import library, {
    LibraryStore,
    resultType,
    boxLevel,
    MapRule,
    libraryConfig,
    LibraryTree,
    MapResult,
    DirMetadata,
    FileMetadata,
} from "@s/store/library"
import { filterDirFile, dotGet, Tree, TaskPool } from "@s/utils"
import { treeMerger } from "@s/utils/tree"
import { logger, scrapeLogger } from "@s/utils/logger"
import { throttle } from "lodash"
import { scraperEvents } from "@s/modules/events"
import { Worker } from "worker_threads"
import { v4 as uuidv4 } from "uuid"

type FilterAndAppend = (filePath: string) => Promise<object | undefined>
export interface ScraperConfig {
    rootPath: string
    name: string
    category: "video" | "anime"
    mapFile?: MapRule
    mapDir?: MapRule
    config?: libraryConfig
}

interface SetProgress {
    total?: number
    stageName?: string
    stageId?: number
    stageTotal?: number
    currentName?: string
    currentId?: number
}

export interface TaskProgress extends SetProgress {
    state: "pending" | "fulfilled" | "rejected"
    name: string
    uuid: string
}

const emitProgress = throttle(
    (progress: TaskProgress) => scraperEvents.emitProgress(progress),
    1000,
    {
        leading: false,
    },
)

export class TaskProgressController {
    progress: TaskProgress
    count = 0
    constructor(name: string) {
        this.progress = this.initProgress(name)
    }
    initProgress(name) {
        return new Proxy(
            {
                state: "pending",
                name: name,
                uuid: uuidv4(),
            } as TaskProgress,
            {
                get(target, key) {
                    return Reflect.get(target, key)
                },
                set(target, key, value) {
                    if (this.count++ % 10 === 0) {
                        logger.debug("progress", target)
                    }
                    return Reflect.set(target, key, value)
                },
            },
        )
    }
    setTotal(total: number) {
        this.progress.total = total
        emitProgress(this.progress)
        return this
    }
    setStage(stage: {
        stageName?: string
        stageId?: number
        stageTotal?: number
        currentName?: string
        currentId?: number
    }) {
        const deleteList = ["stageName", "stageId", "stageTotal", "currentName", "currentId"]
        if (this.progress.stageName !== stage.stageName) {
            deleteList.forEach((key) => delete this.progress[key])
        }
        Object.assign(this.progress, stage)
        emitProgress(this.progress)
        return this
    }
    setCurrent(current: { currentName?: string; currentId?: number }) {
        ;["currentName", "currentId"].forEach((key) => delete this.progress[key])
        Object.assign(this.progress, current)
        emitProgress(this.progress)
        return this
    }
    end() {
        emitProgress({
            state: "fulfilled",
            name: this.progress.name,
            uuid: this.progress.uuid,
        })
        this.progress = this.initProgress(this.progress.name)
    }
    reject() {
        emitProgress({
            state: "rejected",
            name: this.progress.name,
            uuid: this.progress.uuid,
        })
        this.progress = this.initProgress(this.progress.name)
    }
}

//需要插件化的地方暂时用动态导入替代
export class Scraper {
    public dirAndFile: { fileList: string[]; dirList: string[] }
    public library: LibraryStore[""]
    public saveTimer
    public progressController: TaskProgressController
    constructor() {}

    setSaveTimer() {
        this.saveTimer = setInterval(() => {
            this.save()
        }, 10000)
    }

    /**
     * countDirAndFile
     */
    public async countDirAndFile(updatePath?: string) {
        this.progressController.setStage({ stageName: "countDirAndFile" })
        const fileList = []
        const dirList = []
        await filterDirFile.call(this, updatePath || this.library.rootPath, { fileList, dirList })
        if (updatePath) dirList.push(updatePath)
        this.dirAndFile = { fileList, dirList }
    }

    /**
     * save
     */
    public save() {
        library[this.library.name] = this.library
    }

    /**
     * load
     */
    public async load(scraperName: string, scraperConfig: object) {}

    /**
     * build
     */
    public async build({ rootPath, name, category, mapFile, mapDir, config }: ScraperConfig) {
        try {
            logger.debug("build", rootPath, name, category, mapFile, mapDir, config)
            if (library[name]) {
                return Promise.reject("资源库不可重名")
            }
            this.progressController = new TaskProgressController(name)
            this.progressController.setStage({ stageName: "start build" + rootPath })
            this.library = {
                rootPath: resolve(rootPath),
                name,
                category: category || "anime",
                flatFile: {},
                flatDir: {},
                mapFile: mapFile || {
                    path: "baseInfo.path",
                    result: "baseInfo.result",
                    display: "baseInfo.display",
                    mime: "baseInfo.mime",
                    pixFmt: "baseInfo.pixFmt",
                    poster: "scraperInfo.extPic.poster",
                    title: "scraperInfo.dandan.title",
                    order: "scraperInfo.dandan.episode",
                    parentTitle: "scraperInfo.dandan.animeTitle",
                },
                mapDir: mapDir || {
                    order: "scraperInfo.dandan.animeId",
                    path: "baseInfo.path",
                    title: ["scraperInfo.dandan.animeTitle", "scraperInfo.children.title"],
                    result: "baseInfo.result",
                    poster: "scraperInfo.local.poster",
                    create: "baseInfo.birthtime",
                    add: "baseInfo.add",
                    update: "baseInfo.update",
                    change: "baseInfo.mtime",
                    air: "scraperInfo.dandan.startDate",
                    rank: "scraperInfo.dandan.rating",
                    like: "scraperInfo.dandan.isFavorited",
                },
                config: config || {
                    library: {},
                },
                tree: {
                    libName: name,
                    label: "",
                    title: "",
                    path: resolve(rootPath),
                    result: "dir",
                },
            }
            this.setSaveTimer()
            //统计库根路径下的所有文件与文件夹
            logger.debug("build countDirAndFile")
            await this.countDirAndFile()
            //过滤出所需类型的文件并附加相关信息
            logger.debug("build filterFileType")
            await this.filterFileType()
            this.save()
            //仅通过层级关系初始化文件夹box类型及基础信息
            logger.debug("build initDirLevel")
            await this.initDirLevel(true)
            this.save()
            //调用刮削器对单文件进行刮削
            logger.debug("build scrapeFlatFile")
            await this.scrapeFlatFile()
            this.save()
            //映射出文件的最终刮削结果
            logger.debug("build mapFileResult")
            await this.mapFileResult()
            this.save()
            //对文件夹进行刮削
            logger.debug("build scrapeFlatDir")
            await this.scrapeFlatDir()
            this.save()
            //映射文件夹的最终刮削结果
            logger.debug("build mapDirResult")
            await this.mapDirResult()
            this.save()
            logger.debug("build flatToTree")
            this.flatToTree()
            this.progressController.end()
        } catch (error) {
            logger.error("build", error)
            this.progressController.reject()
        }
        clearInterval(this.saveTimer)
    }

    /**
     * mount
     */
    public mount(libName: string) {
        if (!library[libName]) {
            throw new Error("不存在")
        }
        this.library = library[libName]
        this.progressController = new TaskProgressController(libName)
        return this
    }

    /**
     * filterFileTypefilestat
     */
    public async filterFileType() {
        this.progressController.setStage({
            stageName: "filterFileType",
            stageTotal: this.dirAndFile.fileList.length,
            currentId: this.progressController.progress.currentId,
        })
        this.library.flatFile = this.library.flatFile || {}
        const filterAndAppend = (await import("./video/filterAndAppend")).default
        for (let index = 0; index < this.dirAndFile.fileList.length; index++) {
            try {
                const filePath = this.dirAndFile.fileList[index]
                const baseInfo = await this.singleUpdata(filePath, filterAndAppend)
                console.log(index, "/", this.dirAndFile.fileList.length - 1)
                this.progressController.setCurrent({ currentId: index, currentName: filePath })
            } catch (error) {
                console.log(error)
            }
        }
    }

    /**
     * singleUpdata
     */
    public async singleUpdata(
        filePath: string,
        filterAndAppend: FilterAndAppend = () => Promise.resolve({}),
    ) {
        const flat = this.library.flatFile

        let exist = true
        const checkList = ["path", "title", "result", "display", "mime", "hash", "pixFmt"]
        let i = 0
        while (i < checkList.length) {
            const key = checkList[i]
            const value = flat[filePath]?.baseInfo?.[key]
            if (value == undefined || (typeof value === "string" && value.length === 0)) {
                exist = false
                break
            }
            i++
        }

        if (exist) return

        const filetrResult = await filterAndAppend(filePath)
        if (filetrResult) {
            // const fileStat = await stat(filePath)
            const baseInfo = {
                path: filePath,
                title: basename(filePath).replace(extname(filePath), ""),
                result: "item" as const,
                display: "video",
                // size: fileStat.size,
                // atime: fileStat.atime,
                // mtime: fileStat.mtime,
                // ctime: fileStat.ctime,
                // birthtime: fileStat.birthtime,
                ...filetrResult,
            }
            flat[filePath] = { ...flat[filePath], baseInfo }
            return baseInfo
        }
        return undefined
    }

    /**
     * initDirLevel
     */
    public async initDirLevel(overwrtie = false, targetPath?: string) {
        const count: {
            [key in boxLevel]: object
        } = {
            box0: {},
            box1: {},
            box2: {},
            box3: {},
        }

        //统计boxlevel
        for (const filePath in this.library.flatFile) {
            Object.keys(count).reduce((prePath: string, key) => {
                const boxPath = dirname(prePath)
                const countTarget = count[key]
                if (!countTarget[boxPath]) {
                    countTarget[boxPath] = 1
                } else countTarget[boxPath]++
                return boxPath
            }, filePath)
        }
        scrapeLogger.debug("initDirLevel count", count)

        for (const level in count) {
            const levelCount = count[level]
            for (const boxPath in levelCount) {
                const boxNum = levelCount[boxPath]
                const target = this.library.flatDir[boxPath]
                if (!target || overwrtie || boxPath.includes(targetPath)) {
                    const box =
                        this.library.flatDir[boxPath] ??
                        (this.library.flatDir[boxPath] = {} as DirMetadata)

                    //生成box基础信息
                    box.baseInfo = box.baseInfo || {
                        path: boxPath,
                        title: basename(boxPath),
                        result: this.library.rootPath.includes(boxPath)
                            ? "dir"
                            : (level as boxLevel),
                        children: [
                            ...Object.keys(this.library.flatFile).filter(
                                (filePath) => dirname(filePath) === boxPath,
                            ),
                            ...Object.keys(this.library.flatDir).filter(
                                (dirPath) => dirname(dirPath) === boxPath,
                            ),
                        ],
                    }
                    box.userInfo = box.userInfo || {}
                    box.scraperInfo = box.scraperInfo || {
                        mapResult: {},
                    }
                } else {
                    //排除掉个别存储位置不规范的文件的干扰
                    if (
                        Object.keys(count).includes(target.baseInfo.result) &&
                        boxNum > count[target.baseInfo.result][boxPath]
                    ) {
                        target.baseInfo.result = level
                    }
                }
            }
        }
        // console.log(this.library.flatDir)
    }

    /**
     * scrapeFlatFile
     */
    public async scrapeFlatFile(method: "single" | "combined" = "single") {
        const scrapers = [
            (await import("./video/fileScraper_dandan")).default,
            (await import("./video/fileScraper_extPic")).default,
        ]
        for (let index = 0; index < scrapers.length; index++) {
            const scraper = scrapers[index].bind(this)
            try {
                await scraper(this.library)
            } catch (error) {
                scrapeLogger.error("scrapeFlatFile", error)
            }
        }
    }

    /**
     * mapFileResult
     */
    public async mapFileResult() {
        const libMap = this.library.mapFile
        const mapFilter = (await import("./video/mapFilter")).default
        Object.values(this.library.flatFile).forEach((fileMetaData, ind, arr) => {
            // fileMetaData.scraperInfo = fileMetaData.scraperInfo || {}
            const mapData = (fileMetaData.scraperInfo.mapResult =
                {} as FileMetadata["scraperInfo"]["mapResult"])
            for (const mapName in libMap) {
                const mapTarget = libMap[mapName]
                const res = mapFilter(fileMetaData, mapTarget)
                if (res) {
                    mapData[mapName] = res
                }
            }
            // console.log(mapData)
        })
    }

    /**
     * scrapeFlatDir
     */
    public async scrapeFlatDir() {
        this.progressController.setStage({ stageName: "scrapeFlatDir" })
        const scrapers = [
            (await import("./video/boxTitleScraper")).default.bind(this),
            (await import("./video/appendDir")).default.bind(this),
        ]
        const boxLevel: boxLevel[] = ["box0", "box1", "box2", "box3"]
        for (let index = 0; index < boxLevel.length; index++) {
            const level = boxLevel[index]
            for (let ind = 0; ind < scrapers.length; ind++) {
                this.progressController.setCurrent({ currentId: ind })
                const scraper = scrapers[ind]
                await scraper(this.library, level)
            }
        }
    }

    /**
     * appendDirResult
     */
    public async mapDirResult() {
        this.progressController.setStage({
            stageName: "mapDirResult",
            stageTotal: Object.values(this.library.flatDir).length,
        })
        const libMap = this.library.mapDir
        const mapFilter = (await import("./video/mapFilter")).default
        const dirList = Object.values(this.library.flatDir)
        for (let ind = 0; ind < dirList.length; ind++) {
            const dirMetadata = dirList[ind]
            this.progressController.setCurrent({ currentId: ind })
            const mapData = (dirMetadata.scraperInfo.mapResult =
                {} as DirMetadata["scraperInfo"]["mapResult"])
            for (const mapName in libMap) {
                const mapTarget = libMap[mapName]
                const res = mapFilter(dirMetadata, mapTarget)
                if (res) {
                    mapData[mapName] = res
                }
            }
        }
    }

    /**
     * flatToTree
     */
    public flatToTree() {
        try {
            this.progressController.setStage({ stageName: "flatToTree-start" })
            const nodeList: MapResult[] = [
                ...Object.values(this.library.flatDir).map((v) => v.scraperInfo?.mapResult),
                ...Object.values(this.library.flatFile).map((v) => v.scraperInfo?.mapResult),
            ]
            const tree: Tree = {}
            const branches = []
            for (let index = 0; index < nodeList.length; index++) {
                const node = nodeList[index]
                try {
                    delete node.children
                    const nodePath = node.path
                    const nodePathSegment = nodePath.split(path.sep)
                    const branch: Tree = {}
                    nodePathSegment.reduce((pre, val, ind, arr) => {
                        const child = {}
                        pre.label = val
                        if (ind < arr.length - 1) {
                            pre.children = []
                            pre.children.push(child)
                        } else Object.assign(pre, node)
                        return child
                    }, branch)
                    branches.push(branch)
                } catch (error) {
                    scrapeLogger.error("flatToTree", error)
                }
            }

            treeMerger(tree, branches)
            this.library.tree = tree
            this.save()
            this.progressController.setStage({ stageName: "flatToTree-end" })
            return tree
        } catch (error) {
            scrapeLogger.error("flatToTree", error)
        }
    }

    /**
     * repair
     */
    public async repair(targetPath?: string) {
        try {
            scrapeLogger.info(
                "repair start",
                this.library.name,
                targetPath ?? this.library.rootPath,
            )
            this.progressController = new TaskProgressController("repair " + this.library.name)
            this.progressController.setStage({ stageName: "repair start" + this.library.name })
            this.setSaveTimer()
            await this.cleanInexistent(targetPath)

            let fileList = this.dirAndFile?.fileList
            let dirList = this.dirAndFile?.dirList
            let flatFileList = Object.keys(this.library?.flatFile)
            const flatDirList = Object.keys(this.library?.flatDir)
            if (!targetPath && !(dirList?.length > 0 && fileList?.length > 0)) {
                await this.countDirAndFile()
                fileList = this.dirAndFile?.fileList
                dirList = this.dirAndFile?.dirList
                this.save()
            }
            if (flatFileList?.length < fileList?.length) {
                console.log(flatFileList?.length, fileList?.length)

                await this.filterFileType()
                flatFileList = Object.keys(this.library?.flatFile)
                this.save()
            }
            //仅通过层级关系初始化文件夹box类型及基础信息
            await this.initDirLevel(false, targetPath)
            this.save()
            //调用刮削器对单文件进行刮削
            await this.scrapeFlatFile()
            this.save()
            //映射出文件的最终刮削结果
            await this.mapFileResult()
            this.save()
            //对文件夹进行刮削
            await this.scrapeFlatDir()
            this.save()
            //映射文件夹的最终刮削结果
            await this.mapDirResult()
            this.save()
            this.flatToTree()
            this.save()
            this.progressController.end()
        } catch (error) {
            this.progressController.reject()
            scrapeLogger.error("repair error", error)
        }
        clearInterval(this.saveTimer)
        console.log("~~~~~~~~~~~~~~~done")
    }

    /**
     * cleanInexistent
     */
    public async cleanInexistent(targetPath?: string) {
        let flatFileList = Object.keys(this.library.flatFile)
        if (targetPath) {
            flatFileList = flatFileList.filter((filePath) => filePath.includes(targetPath))
        }
        for (let index = 0; index < flatFileList.length; index++) {
            const filePath = flatFileList[index]
            try {
                await access(filePath)
            } catch (error) {
                delete this.library.flatFile[filePath]
            }
        }

        let flatDirList = Object.keys(this.library.flatDir)
        if (targetPath) {
            flatDirList = flatDirList.filter((dirPath) => dirPath.includes(targetPath))
        }
        for (let index = 0; index < flatDirList.length; index++) {
            const filePath = flatDirList[index]
            try {
                await access(filePath)
            } catch (error) {
                delete this.library.flatDir[filePath]
            }
        }
    }

    /**
     * update
     */
    public async update(libName: string, targetPath: string) {
        try {
            scrapeLogger.info("start update", libName, "---------", targetPath)
            this.progressController = new TaskProgressController("update " + libName)
            this.progressController.setCurrent({ currentName: "start update" + libName })
            if (this.library == undefined) {
                this.mount(libName)
            }

            try {
                await access(targetPath)
            } catch (error) {
                scrapeLogger.info("update Inexistent", libName, "---------", targetPath)
                try {
                    await this.cleanInexistent(targetPath)
                    this.flatToTree()
                    this.save()
                    this.progressController.end()
                    return
                } catch (error) {
                    scrapeLogger.error("update Inexistent", error)
                    return
                }
            }

            try {
                scrapeLogger.info("update 1")
                await this.mount(libName)
                scrapeLogger.info("update 2")
                await this.countDirAndFile(targetPath)
                scrapeLogger.info("update 3")
                await this.repair(targetPath)
            } catch (error) {
                scrapeLogger.error("update", error)
                this.progressController.reject()
            }

            scrapeLogger.info("update end", libName, "---------", targetPath)
        } catch (error) {
            scrapeLogger.error("update", libName, "---------", targetPath, error)
        }
    }

    async close() {
        clearInterval(this.saveTimer)
    }
}

export class Scrapers {
    worker: Worker
    name: string
    /**
     * init
     */
    public async init() {
        this.worker
    }
    /**
     * getDefaultConfig
     */
    public async getDefaultConfig() {
        return new Promise<void>((resolve, reject) => {
            this.worker.postMessage({ method: "defaultConfig" })
            this.worker.on("message", (msg) => {
                if (msg.error || msg instanceof Error) reject(msg.error ?? msg)
                if (msg.method === "defaultConfig") resolve(msg.result)
                setTimeout(() => {
                    this.worker.postMessage({ method: "exit" })
                    reject(this.name + "defaultConfig no result")
                }, 2000)
            })
        })
    }
}

class ScraperCenter {
    taskPool = new TaskPool(1)
    scraperList: {
        [scraperName: string]: () => Scraper
    }
    /**
     * updateScraperList
     */
    public async updateScraperList() {}
    /**
     * getScraperDefaultConfig
     */
    public async getScraperDefaultConfig(scraperName: string) {
        const scraper = this.scraperList[scraperName]()
        try {
            await scraper.init()
            return await scraper.getDefaultConfig()
        } catch (error) {}
    }

    /**
     * postScraperConfig
     */
    public async postScraperConfig(scraper: Worker) {
        scraper.postMessage({ method: "setConfig" })
    }
}

export default new TaskPool(1)
