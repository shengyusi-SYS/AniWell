import { boxLevel, LibraryStore } from '@s/store/library'
import { screenObject } from '@s/utils'
import { scrapeLogger } from '@s/utils/logger'
import { toWebp } from '@s/utils/media/picture'
import { access, stat, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { TaskProgressController } from '..'
export default async function (library: LibraryStore[''], level: boxLevel) {
    const flatDir = screenObject(library.flatDir, this.dirAndFile?.dirList)
    // console.log('---------------flatDir', this.dirAndFile?.dirList, '==============')

    const downloadList = []
    const boxPaths = Object.values(flatDir)
        .filter((v) => v.baseInfo.result === level)
        .map((v) => v.baseInfo.path)

    const progressController: TaskProgressController = this.progressController
    if (progressController) {
        progressController.setStage({
            stageName: 'appendDir ' + level,
            stageTotal: boxPaths.length,
        })
    }

    for (let index = 0; index < boxPaths.length; index++) {
        const boxPath = boxPaths[index]
        const box = flatDir[boxPath]

        progressController.setCurrent({ currentName: boxPath, currentId: index })

        const boxTitle = box.scraperInfo?.children?.title || box.baseInfo.title

        box.scraperInfo.local = box.scraperInfo.local || {}

        try {
            box.baseInfo.update = new Date()
            box.baseInfo.add = box.baseInfo.add || new Date()
            const { birthtime, mtime } = await stat(boxPath)
            box.baseInfo.birthtime = box.baseInfo.birthtime || birthtime
            box.baseInfo.mtime = box.baseInfo.mtime || mtime
        } catch (error) {
            scrapeLogger.error('appendDir error',error)
        }

        if (
            box.scraperInfo.dandan == undefined &&
            (level === 'box0' || boxTitle !== box.baseInfo.title)
        ) {
            try {
                const info = await getAnimeInfo(boxTitle)
                if (info) {
                    box.scraperInfo.dandan = info
                    box.scraperInfo.children.title = info.animeTitle
                }
            } catch (error) {}
        }

        const posterNameList = ['poster.jpg', 'folder.jpg']
        const posterPathList = posterNameList.map((posterName) => resolve(boxPath, posterName))
        box.scraperInfo.local.poster = undefined
        for (let index = 0; index < posterPathList.length; index++) {
            const posterPath = posterPathList[index]
            try {
                await access(posterPath)
                box.scraperInfo.local.poster = posterPath
            } catch (error) {}
        }

        const imageUrl = box.scraperInfo.dandan?.imageUrl
        if (box.scraperInfo.local.poster == undefined && imageUrl && typeof imageUrl === 'string') {
            if (downloadList.length >= 32) {
                await Promise.allSettled(downloadList)
                downloadList.length = 0
            }
            scrapeLogger.debug('downloadList', downloadList.length, index, boxPath)
            downloadList.push(
                new Promise<void>(async (resolve, reject) => {
                    try {
                        const poster = await getAnimePoster(imageUrl, true, true)
                        const posterPath = posterPathList[posterPathList.length - 1]
                        await writeFile(posterPath, poster)
                        box.scraperInfo.local.poster = posterPath
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                }),
            )
        }
    }
    if (downloadList.length > 0) {
        await Promise.allSettled(downloadList)
    }
    scrapeLogger.info('downloadList end')
    downloadList.length = 0
}

const getAnimeInfo = async (
    title: string,
    animeId?: number,
): Promise<{
    animeId: number
    animeTitle: string
    type: string
    typeDescription: string
    imageUrl: string
    startDate: string
    episodeCount: number
    rating: number
    isFavorited: boolean
}> => {
    if (!title) return Promise.reject()

    const res = await new Promise<void>(async (resolve, reject) => {
        const controller = new AbortController()
        const signal = controller.signal
        const timeout = setTimeout(() => {
            controller.abort()
            reject('timeout')
        }, 10000)
        try {
            const res = await (
                await fetch(
                    `https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURIComponent(
                        title,
                    )}`,
                    { signal },
                )
            ).json()
            resolve(res)
        } catch (error) {
            reject(error)
        }
    })

    const info = animeId ? res.animes.find((v) => v.animeId === animeId) : res.animes[0]
    return info
}

const getAnimePoster = async (url: string, highQuality?: boolean, webp?: boolean) => {
    const buffer = await new Promise<Buffer>(async (resolve, reject) => {
        const controller = new AbortController()
        const signal = controller.signal
        const timeout = setTimeout(() => {
            controller.abort()
            reject('timeout')
        }, 10000)
        try {
            const res = Buffer.from(
                await (
                    await fetch(highQuality ? url.replace('_medium', '') : url, { signal })
                ).arrayBuffer(),
            )
            resolve(res)
        } catch (error) {
            reject(error)
        }
    })
    let result = buffer
    if (webp) {
        try {
            result = await toWebp(buffer)
        } catch (error) {
            scrapeLogger.error('toWebp error', error)
        }
    }

    return result
}
