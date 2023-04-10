import { boxLevel, LibraryStore } from '@s/store/library'
import { toWebp } from '@s/utils/media/picture'
import { access, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { TaskProgressController } from '..'
export default async function (library: LibraryStore[''], level: boxLevel) {
    const flatDir = library.flatDir

    const downloadList = []
    const boxPaths = Object.values(flatDir)
        .filter((v) => v.baseInfo.result === level)
        .map((v) => v.baseInfo.path)

    const progressController: TaskProgressController = this.progressController
    if (progressController) {
        progressController.setStage({
            stageName: 'appendDir' + level,
            stageTotal: boxPaths.length,
        })
    }

    for (let index = 0; index < boxPaths.length; index++) {
        const boxPath = boxPaths[index]
        const box = flatDir[boxPath]

        progressController.setCurrent({ currentName: boxPath, currentId: index })

        const boxTitle = box.scraperInfo?.children?.title || box.baseInfo.title

        box.scraperInfo.local = box.scraperInfo.local || {}

        if (
            level === 'box0' ||
            (box.scraperInfo.dandan == undefined && boxTitle !== box.baseInfo.title)
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
            downloadList.push(
                new Promise<void>(async (resolve, reject) => {
                    try {
                        const poster = await getAnimePoster(imageUrl, true, true)
                        const posterPath = posterPathList[posterPathList.length - 1]
                        await writeFile(posterPath, poster)
                        box.scraperInfo.local.poster = posterPath
                    } catch (error) {
                        reject(error)
                    }
                }),
            )
        }
    }
    await Promise.allSettled(downloadList)
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

    const res = await (
        await fetch(
            `https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURIComponent(title)}`,
        )
    ).json()

    const info = animeId ? res.animes.find((v) => v.animeId === animeId) : res.animes[0]
    return info
}

const getAnimePoster = async (url: string, highQuality?: boolean, webp?: boolean) => {
    const buffer = Buffer.from(
        await (await fetch(highQuality ? url.replace('_medium', '') : url)).arrayBuffer(),
    )
    return webp ? await toWebp(buffer) : buffer
}
