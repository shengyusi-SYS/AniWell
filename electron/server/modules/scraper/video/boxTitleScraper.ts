import { boxLevel, LibraryStore } from '@s/store/library'
import { screenObject } from '@s/utils'
import { scrapeLogger } from '@s/utils/logger'
import { diffChars } from 'diff'
import { readdir } from 'fs/promises'
import { TaskProgressController } from '..'

export default async function (library: LibraryStore[''], level: boxLevel) {
    const flatFile = library.flatFile
    const flatDir = library.flatDir

    const boxPathList = Object.values(flatDir)
        .filter((v) => v.baseInfo.result === level)
        .map((v) => v.baseInfo.path)

    const progressController: TaskProgressController = this.progressController
    if (progressController) {
        progressController.setStage({
            stageName: 'boxTitle' + level,
            stageTotal: boxPathList.length,
        })
    }

    let i = 0
    while (i < boxPathList.length) {
        const count: { [title: string]: number } = {}

        const boxPath = boxPathList[i]
        const box = flatDir[boxPath]
        const childrenPathList = box.baseInfo.children

        progressController.setCurrent({ currentName: boxPath, currentId: i })

        box.scraperInfo.children = box.scraperInfo.children ?? {}

        const titleList: string[] = childrenPathList
            .map(
                (path) =>
                    flatFile[path]?.scraperInfo?.mapResult?.parentTitle ||
                    flatDir[path]?.scraperInfo?.children?.title,
            )
            .filter((title) => title != undefined && title !== 'undefined')
        // if (level === 'box0') {
        //     titleList = childrenPathList
        //         .map((filePath) => flatFile[filePath]?.scraperInfo?.mapResult?.parentTitle)
        //         .filter((title) => title != undefined && title !== 'undefined')
        // } else {
        //     titleList = childrenPathList
        //         .map((dirPath) => flatDir[dirPath]?.scraperInfo?.children?.title)
        //         .filter((title) => title != undefined && title !== 'undefined')
        // }

        if (titleList.length > 1) {
            const sameTitles = titleList.flatMap((curTitle, index) => {
                return titleList
                    .filter((v, i) => i > index)
                    .map((title, ind) => {
                        return diffChars(title, curTitle).find((v) => !v.added && !v.removed)?.value
                    })
            })
            scrapeLogger.debug('boxTitle' + level + 'sameTitles', sameTitles)
            sameTitles.forEach((title) => {
                if (!count[title]) {
                    count[title] = 1
                } else count[title]++
            })
            scrapeLogger.debug('boxTitle' + level + 'count', count)
            const tltles = Object.keys(count)
            let titleResult
            if (tltles.length > 0) {
                titleResult = tltles.reduce((pre, cur, ind) => {
                    if (count[cur] > count[pre]) {
                        return cur
                    } else if (count[cur] === count[pre] && cur.length > pre.length) {
                        return cur
                    } else return pre
                })
            }
            scrapeLogger.debug('boxTitle' + level + 'titleResult', titleResult)

            box.scraperInfo.children.title =
                titleResult != undefined && titleResult !== 'undefined'
                    ? titleResult
                    : box.baseInfo.title
        } else {
            box.scraperInfo.children.title = titleList[0] ?? box.baseInfo.title
        }

        i++
    }
}
