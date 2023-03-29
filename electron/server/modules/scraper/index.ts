import path, { basename, dirname, extname, resolve } from 'path'
import { readFile, readdir, stat, writeFile } from 'fs/promises'
import library, {
    LibraryStore,
    resultType,
    boxLevel,
    MapRule,
    libraryConfig,
    LibraryTree,
    MapResult,
} from '@s/store/library'
import { filterDirFile, dotGet, Tree, TaskPool } from '@s/utils'
import { treeMerger } from '@s/utils/tree'
import { scrapeLogger } from '@s/utils/logger'
import { throttle } from 'lodash'
import { scraperEvents } from '@s/modules/events'
import { Worker } from 'worker_threads'
import { v4 as uuidv4 } from 'uuid'

type FilterAndAppend = (filePath: string) => Promise<object | undefined>
export interface ScraperConfig {
    rootPath: string
    name: string
    category: 'video' | 'anime'
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
    state: 'pending' | 'fulfilled' | 'rejected'
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
    constructor(name: string) {
        this.progress = this.initProgress(name)
    }
    initProgress(name) {
        return new Proxy(
            {
                state: 'pending',
                name: name,
                uuid: uuidv4(),
            } as TaskProgress,
            {
                get(target, key) {
                    return Reflect.get(target, key)
                },
                set(target, key, value) {
                    emitProgress(target)
                    return Reflect.set(target, key, value)
                },
            },
        )
    }
    setTotal(total: number) {
        this.progress.total = total
    }
    setStage(stage: {
        stageName?: string
        stageId?: number
        stageTotal?: number
        currentName?: string
        currentId?: number
    }) {
        ;['stageName', 'stageId', 'stageTotal', 'currentName', 'currentId'].forEach(
            (key) => delete this.progress[key],
        )
        Object.assign(this.progress, stage)
    }
    setCurrent(current: { currentName?: string; currentId?: number }) {
        ;['currentName', 'currentId'].forEach((key) => delete this.progress[key])
        Object.assign(this.progress, current)
    }
    end() {
        emitProgress({
            state: 'fulfilled',
            name: this.progress.name,
            uuid: this.progress.uuid,
        })
        this.progress = {}
    }
    reject() {
        emitProgress({
            state: 'rejected',
            name: this.progress.name,
            uuid: this.progress.uuid,
        })
        this.progress = {}
    }
}

//需要插件化的地方暂时用动态导入替代
export class Scraper {
    public dirAndFile: { fileList: string[]; dirList: string[] }
    public library: LibraryStore['']
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
    public async countDirAndFile() {
        const fileList = []
        const dirList = []

        await filterDirFile(this.library.rootPath, { fileList, dirList })
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
            if (library[name]) {
                return Promise.reject('资源库不可重名')
            }
            this.progressController = new TaskProgressController(name)
            this.library = {
                rootPath: resolve(rootPath),
                name,
                category: category || 'anime',
                flatFile: {},
                flatDir: {},
                mapFile: mapFile || {
                    path: 'baseInfo.path',
                    result: 'baseInfo.result',
                    display: 'baseInfo.display',
                    mime: 'baseInfo.mime',
                    poster: 'scraperInfo.extPic.poster',
                    title: 'scraperInfo.dandan.title',
                    order: 'scraperInfo.dandan.episode',
                    parentTitle: 'scraperInfo.dandan.animeTitle',
                },
                mapDir: mapDir || {
                    order: '',
                    path: 'baseInfo.path',
                    title: 'scraperInfo.children.title',
                    result: 'baseInfo.result',
                    poster: 'scraperInfo.local.poster',
                },
                config: config || {
                    library: {},
                },
                tree: {
                    libName: name,
                    label: '',
                    title: '',
                    path: resolve(rootPath),
                    result: 'dir',
                },
            }
            this.setSaveTimer()
            //统计库根路径下的所有文件与文件夹
            await this.countDirAndFile()
            //过滤出所需类型的文件并附加相关信息
            await this.filterFileType()
            this.save()
            //仅通过层级关系初始化文件夹box类型及基础信息
            await this.initDirLevel(true)
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
            this.progressController.end()
        } catch (error) {
            this.progressController.reject()
            scrapeLogger.error('build', error)
        }
        clearInterval(this.saveTimer)
    }

    /**
     * mount
     */
    public async mount(libName: string) {
        if (!library[libName]) {
            return Promise.reject('不存在')
        }

        this.library = library[libName]
        this.progressController = new TaskProgressController(libName)
    }

    /**
     * filterFileType
     */
    public async filterFileType() {
        this.progressController.setStage({ stageName: 'filterFileType' })
        this.library.flatFile = {}
        const filterAndAppend = (await import('./video/filterAndAppend')).default
        for (let index = 0; index < this.dirAndFile.fileList.length; index++) {
            try {
                const filePath = this.dirAndFile.fileList[index]
                const baseInfo = await this.singleUpdata(filePath, filterAndAppend)
                console.log(index, '/', this.dirAndFile.fileList.length - 1)
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
        const filetrResult = await filterAndAppend(filePath)
        if (filetrResult) {
            const filestat = await stat(filePath)
            const baseInfo = {
                path: filePath,
                title: basename(filePath).replace(extname(filePath), ''),
                result: 'item' as const,
                display: 'video',
                size: filestat.size,
                atime: filestat.atime,
                mtime: filestat.mtime,
                ctime: filestat.ctime,
                birthtime: filestat.birthtime,
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
    public async initDirLevel(overwrtie = false) {
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

        for (const level in count) {
            const levelCount = count[level]
            for (const boxPath in levelCount) {
                const boxNum = levelCount[boxPath]
                const target = this.library.flatDir[boxPath]
                if (!target || overwrtie) {
                    //生成box基础信息
                    this.library.flatDir[boxPath] = {
                        baseInfo: {
                            path: boxPath,
                            title: basename(boxPath),
                            result: this.library.rootPath.includes(boxPath) ? 'dir' : level,
                            children:
                                level === 'box0'
                                    ? Object.keys(this.library.flatFile).filter(
                                          (filePath) => dirname(filePath) === boxPath,
                                      )
                                    : Object.keys(this.library.flatDir).filter(
                                          (dirPath) => dirname(dirPath) === boxPath,
                                      ),
                        },
                        userInfo: {},
                        scraperInfo: {
                            mapResult: {},
                        },
                    }
                } else {
                    //排除掉个别存储位置不规范的文件的干扰
                    if (target.baseInfo.result && boxNum > count[target.baseInfo.result][boxPath]) {
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
    public async scrapeFlatFile(method: 'single' | 'combined' = 'single') {
        const scrapers = [
            (await import('./video/fileScraper_dandan')).default,
            (await import('./video/fileScraper_extPic')).default,
        ]
        for (let index = 0; index < scrapers.length; index++) {
            const scraper = scrapers[index].bind(this)
            try {
                await scraper(this.library)
            } catch (error) {
                scrapeLogger.error('scrapeFlatFile', error)
            }
        }
    }

    /**
     * mapFileResult
     */
    public async mapFileResult() {
        const libMap = this.library.mapFile
        const mapFilter = (await import('./video/mapFilter')).default
        Object.values(this.library.flatFile).forEach((fileMetaData, ind, arr) => {
            // fileMetaData.scraperInfo = fileMetaData.scraperInfo || {}
            const mapData = (fileMetaData.scraperInfo.mapResult = {})
            for (const mapName in libMap) {
                const mapTarget = libMap[mapName]
                const res = mapFilter(fileMetaData, mapName, mapTarget)
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
        this.progressController.setStage({ stageName: 'scrapeFlatDir' })
        const scrapers = [
            (await import('./video/boxTitleScraper')).default,
            (await import('./video/appendDir')).default,
        ]
        for (let index = 0; index < scrapers.length; index++) {
            this.progressController.setCurrent({ currentId: index })
            const scraper = scrapers[index]
            await scraper(this.library)
        }
    }

    /**
     * appendDirResult
     */
    public async mapDirResult() {
        this.progressController.setStage({
            stageName: 'mapDirResult',
            stageTotal: Object.values(this.library.flatDir).length,
        })
        const libMap = this.library.mapDir
        const mapFilter = (await import('./video/mapFilter')).default
        const dirList = Object.values(this.library.flatDir)
        for (let ind = 0; ind < dirList.length; ind++) {
            const dirMetadata = dirList[ind]
            await this.progressController.setCurrent({ currentId: ind })
            const mapData = (dirMetadata.scraperInfo.mapResult = {})
            for (const mapName in libMap) {
                const mapTarget = libMap[mapName]
                const res = mapFilter(dirMetadata, mapName, mapTarget)
                if (res) {
                    mapData[mapName] = res
                }
            }
        }
    }

    /**
     * appendDirResult
     */
    public flatToTree() {
        try {
            this.progressController.setStage({ stageName: 'flatToTree-start' })
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
                    scrapeLogger.error('flatToTree', error)
                }
            }

            treeMerger(tree, branches)
            this.library.tree = tree
            this.save()
            this.progressController.setStage({ stageName: 'flatToTree-end' })
            return tree
        } catch (error) {
            scrapeLogger.error('flatToTree', error)
        }
    }

    /**
     * allUpdate
     */
    public async allUpdate() {
        this.setSaveTimer()
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
        clearInterval(this.saveTimer)
        console.log('~~~~~~~~~~~~~~~done')
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
            this.worker.postMessage({ method: 'defaultConfig' })
            this.worker.on('message', (msg) => {
                if (msg.error || msg instanceof Error) reject(msg.error ?? msg)
                if (msg.method === 'defaultConfig') resolve(msg.result)
                setTimeout(() => {
                    this.worker.postMessage({ method: 'exit' })
                    reject(this.name + 'defaultConfig no result')
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
        scraper.postMessage({ method: 'setConfig' })
    }
}

export default new TaskPool(1)
