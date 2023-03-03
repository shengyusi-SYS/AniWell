import path, { basename, dirname, extname, resolve } from 'path'
import { readFile, readdir, stat, writeFile } from 'fs/promises'
import library, { Ilibrary, resultType, boxLevel } from '@s/store/library'
import { filterDirFile, dotGet } from '@s/utils'

type FilterAndAppend = (filePath: string) => Promise<object | undefined>

export default class Scraper {
    public dirAndFile: { fileList: string[]; dirList: string[] }
    public library: Ilibrary['']
    constructor() {}

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
    public async build({ libPath, type, name }: { libPath: string; type: string; name: string }) {
        this.library = {
            name,
            type,
            flatFile: {},
            flatDir: {},
            rootPath: resolve(libPath),
            map: {
                path: 'fileInfo.path',
                label: 'fileInfo.label',
                type: 'fileInfo.type',
            },
            config: {
                library: {},
            },
        }
        await this.countDirAndFile()

        const filterAndAppend = (await import('./video/filterAndAppend')).default
        await this.filterFileType(filterAndAppend)
        this.save()
        await this.initDirLevel(true)
        this.save()
        await this.scrapeFlatFile()
        this.save()
        await this.mapFileResult()
        this.save()
        await this.mapDirResult()
        this.save()
        await this.appendDirResult
        this.save()
    }

    /**
     * load
     */
    public async load(libName: string) {
        if (!library[libName]) {
            return Promise.reject('不存在')
        }

        this.library = library[libName]
    }

    /**
     * filterFileType
     */
    public async filterFileType(filterAndAppend: FilterAndAppend = () => Promise.resolve({})) {
        this.library.flatFile = {}
        for (let index = 0; index < this.dirAndFile.fileList.length; index++) {
            try {
                const filePath = this.dirAndFile.fileList[index]
                const fileInfo = await this.singleUpdata(filePath, filterAndAppend)
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
            const fileInfo = {
                path: filePath,
                label: basename(filePath).replace(extname(filePath), ''),
                result: 'item' as const,
                size: filestat.size,
                atime: filestat.atime,
                mtime: filestat.mtime,
                ctime: filestat.ctime,
                birthtime: filestat.birthtime,
                type: this.library.type,
                ...filetrResult,
            }
            flat[filePath] = { ...flat[filePath], fileInfo }
            return fileInfo
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
                    this.library.flatDir[boxPath] = {
                        path: boxPath,
                        label: basename(boxPath),
                        type: this.library.type,
                        result: this.library.rootPath.includes(boxPath) ? 'dir' : level,
                        usersInfo: {},
                        children:
                            level === 'box0'
                                ? Object.keys(this.library.flatFile).filter(
                                      (filePath) => dirname(filePath) === boxPath,
                                  )
                                : Object.keys(this.library.flatDir).filter(
                                      (dirPath) => dirname(dirPath) === boxPath,
                                  ),
                    }
                } else {
                    if (target.result && boxNum > count[target.result][boxPath]) {
                        target.result = level
                    }
                }
            }
        }
        // console.log(this.library.flatDir)
    }

    /**
     * scrapeFlatFile
     */
    public async scrapeFlatFile(method: 'single' | 'combined' = 'single', scraperName = 'dandan') {
        if (method === 'single') {
            return await this.singlyScrapeFlatFile()
        }
        if (method === 'combined') {
            return await this.combinedScrapeFlatFile()
        }
    }

    /**
     * singlyScrapeFlatFile
     */
    public async singlyScrapeFlatFile() {
        const scrapers = [
            (await import('./video/singleFileScraper_dandan')).default,
            (await import('./video/singleFileScraper_extPic')).default,
        ]
        for (let index = 0; index < scrapers.length; index++) {
            const scraper = scrapers[index]
            await scraper(this.library)
        }
    }

    /**
     * combinedScrapeFlatFile
     */
    public async combinedScrapeFlatFile() {
        const scraper = (await import('./video/combinedFileScraper')).default
        await scraper(this.library.flatFile)
    }

    /**
     * mapFileResult
     */
    public async mapFileResult() {
        const libMap = this.library.map
        const mapFilter = (await import('./video/mapFilter')).default
        Object.values(this.library.flatFile).forEach((fileMetaData, ind, arr) => {
            // fileMetaData.scraperInfo = fileMetaData.scraperInfo || {}
            const mapData = (fileMetaData.scraperInfo.map = {})
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
     * mapDirResult
     */
    public async mapDirResult() {
        const flatFile = this.library.flatFile
        const flatDir = this.library.flatDir
        const boxLevel = ['box0', 'box1', 'box2', 'box3']

        for (let index = 0; index < boxLevel.length; index++) {
            const level = boxLevel[index]
            const boxPathList = Object.values(flatDir)
                .filter((v) => v.result === level)
                .map((v) => v.path)
            let i = 0
            while (i < boxPathList.length) {
                const count: { [title: string]: number } = {}
                const boxPath = boxPathList[i]
                const box = flatDir[boxPath]
                const childrenPathList = box.children
                let titleList
                if (level === 'box0') {
                    titleList = childrenPathList.map(
                        (filePath) => flatFile[filePath].scraperInfo?.map?.parentTitle,
                    )
                } else {
                    titleList = childrenPathList.map((dirPath) => flatDir[dirPath].title)
                }
                for (let index = 0; index < titleList.length; index++) {
                    const title = titleList[index]
                    if (title != undefined && title != 'undefined') {
                        if (!count[title]) {
                            count[title] = 1
                        } else count[title]++
                    }
                }
                for (const title in count) {
                    const titleNum = count[title]
                    const existTitle = box.title
                    box.title = existTitle
                        ? titleNum > count[existTitle]
                            ? title
                            : existTitle
                        : title
                }
                i++
            }
        }
    }

    /**
     * appendDirResult
     */
    public async appendDirResult() {
        const appendDir = (await import('./video/appendDir')).default
        await appendDir(this.library)
    }
}

const vs = new Scraper()
vs.load('video')
    // vs.build({ libPath: 'D:/test', type: 'video', name: 'video' })
    .then(async (result) => {
        // await vs.initDirLevel(true)
        // await vs.combinedScrapeFlatFile('dandan')
        // await vs.singlyScrapeFlatFile()
        // await vs.mapFileResult()
        // await vs.mapDirResult()
        // await vs.appendDirResult()

        // vs.save()
        console.log('done')
        // console.log(vs.library)
    })
    .catch((err) => {
        console.log(err)
    })
