import { LibraryStore } from '@s/store/library'

export default async function (library: LibraryStore['']) {
    const flatFile = library.flatFile
    const flatDir = library.flatDir
    const boxLevel = ['box0', 'box1', 'box2', 'box3']

    for (let index = 0; index < boxLevel.length; index++) {
        const level = boxLevel[index]
        const boxPathList = Object.values(flatDir)
            .filter((v) => v.baseInfo.result === level)
            .map((v) => v.baseInfo.path)
        let i = 0
        while (i < boxPathList.length) {
            const count: { [title: string]: number } = {}
            const boxPath = boxPathList[i]
            const box = flatDir[boxPath]
            box.scraperInfo.children = box.scraperInfo.children || {}
            const childrenPathList = box.baseInfo.children
            let titleList
            if (level === 'box0') {
                titleList = childrenPathList.map(
                    (filePath) => flatFile[filePath].scraperInfo?.mapResult?.parentTitle,
                )
            } else {
                titleList = childrenPathList.map((dirPath) => flatDir[dirPath].baseInfo.title)
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
                const existTitle = box.scraperInfo.children.title
                box.scraperInfo.children.title = existTitle
                    ? titleNum > count[existTitle]
                        ? title
                        : existTitle
                    : title
            }
            i++
        }
    }
}
