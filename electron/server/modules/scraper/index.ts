import path, { basename, dirname, extname, resolve } from 'path'
import { readFile, readdir, stat, writeFile } from 'fs/promises'
import library, {
    Ilibrary,
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

type FilterAndAppend = (filePath: string) => Promise<object | undefined>
export interface ScraperConfig {
    rootPath: string
    name: string
    category: 'video' | 'anime'
    mapFile?: MapRule
    mapDir?: MapRule
    config?: libraryConfig
}

const defaultProgress = () =>
    new Proxy(
        {
            current: 0,
            step: '',
            target: '',
            total: 0,
        },
        {
            get(target, key) {
                return Reflect.get(target, key)
            },
            set(target, key, value) {
                scraperEvents.emitProgress(target)
                return Reflect.set(target, key, value)
            },
        },
    )

//需要插件化的地方暂时用动态导入替代
export class Scraper {
    public dirAndFile: { fileList: string[]; dirList: string[] }
    public library: Ilibrary['']
    public saveTimer
    constructor() {}

    setSaveTimer() {
        this.saveTimer = setInterval(() => {
            this.save()
        }, 10000)
    }

    setProgress = throttle(
        function ([current, step, target, total]: [number?, string?, string?, number?] = []) {
            const progress = this.library?.progress
            if (progress) {
                if (current) progress.current = current
                if (step) progress.step = step
                if (target) progress.target = target
                if (total) progress.total = total
            }
        }.bind(this),
        2000,
    )

    /**
     * getProgress
     */
    public async getProgress() {
        return this.library.progress
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
     * build
     */
    public async build({ rootPath, name, category, mapFile, mapDir, config }: ScraperConfig) {
        if (library[name]) {
            return Promise.reject('资源库不可重名')
        }
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
            progress: defaultProgress(),
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
        clearInterval(this.saveTimer)
    }

    /**
     * load
     */
    public async load(libName: string) {
        if (!library[libName]) {
            return Promise.reject('不存在')
        }

        this.library = library[libName]
        this.library.progress = defaultProgress()
    }

    /**
     * filterFileType
     */
    public async filterFileType() {
        this.library.flatFile = {}
        const filterAndAppend = (await import('./video/filterAndAppend')).default
        for (let index = 0; index < this.dirAndFile.fileList.length; index++) {
            try {
                const filePath = this.dirAndFile.fileList[index]
                const baseInfo = await this.singleUpdata(filePath, filterAndAppend)
                console.log(index, '/', this.dirAndFile.fileList.length - 1)
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
        this.setProgress([, 'scrapeFlatDir start'])
        const scrapers = [
            (await import('./video/boxTitleScraper')).default,
            (await import('./video/appendDir')).default,
        ]
        for (let index = 0; index < scrapers.length; index++) {
            this.setProgress([index, 'scrapeFlatDir'])
            const scraper = scrapers[index]
            await scraper(this.library)
        }
    }

    /**
     * appendDirResult
     */
    public async mapDirResult() {
        this.setProgress([, 'mapDirResult start', , Object.values(this.library.flatDir).length])
        const libMap = this.library.mapDir
        const mapFilter = (await import('./video/mapFilter')).default
        Object.values(this.library.flatDir).forEach((dirMetadata, ind, arr) => {
            this.setProgress([ind])
            const mapData = (dirMetadata.scraperInfo.mapResult = {})
            for (const mapName in libMap) {
                const mapTarget = libMap[mapName]
                const res = mapFilter(dirMetadata, mapName, mapTarget)
                if (res) {
                    mapData[mapName] = res
                }
            }
        })
    }

    /**
     * appendDirResult
     */
    public flatToTree() {
        try {
            this.setProgress([, 'flatToTree-start'])
            const nodeList: MapResult[] = [
                ...Object.values(this.library.flatDir).map((v) => v.scraperInfo?.mapResult),
                ...Object.values(this.library.flatFile).map((v) => v.scraperInfo?.mapResult),
            ]
            const tree: Tree = {}
            const branches = []
            for (let index = 0; index < nodeList.length; index++) {
                // this.setProgress([index])
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
            this.setProgress([, 'flatToTree-end'])
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
        delete this.library.progress
        clearInterval(this.saveTimer)
    }
}

class ScraperCenter extends TaskPool {}

export default new ScraperCenter(1)

// setTimeout(() => {
// const vs = new Scraper()
// vs.load('anime')
// vs.build({
//     rootPath: 'D:/test',
//     name: 'anime',
//     mapFile: {
//         path: 'baseInfo.path',
//         result: 'baseInfo.result',
//         display: 'baseInfo.display',
//         mime: 'baseInfo.mime',
//         poster: 'scraperInfo.extPic.poster',
//         title: 'scraperInfo.dandan.title',
//         order: 'scraperInfo.dandan.episode',
//         parentTitle: 'scraperInfo.dandan.animeTitle',
//     },
//     mapDir: {
//         path: 'baseInfo.path',
//         title: 'scraperInfo.children.title',
//         result: 'baseInfo.result',
//         poster: 'scraperInfo.local.poster',
//     },
// })

// .then(async (result) => {})
// .catch((err) => {
//     console.log(err)
// })
// }, 3000)
