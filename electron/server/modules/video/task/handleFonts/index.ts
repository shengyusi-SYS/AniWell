import { readdir, access, mkdir, copyFile } from 'fs/promises'
import path from 'path'
import { extractAndList, extractFonts, listPack } from '@s/utils'
import settings from '@s/store/settings'
import { logger } from '@s/utils/logger'
import { VideoInfo } from '../getVideoInfo'
import paths from '@s/utils/envPath'
import { mkdirSync } from 'fs'
import fontsStore from '@s/store/fonts'

const tempFontsDir = path.resolve(paths.temp, 'fonts')
try {
    mkdirSync(tempFontsDir)
} catch (error) {}

export interface fontInfo {
    url: string
    name: string
}

let cache
async function handleFonts(videoInfo: VideoInfo) {
    const filePath = videoInfo.filePath
    const dirContent = await readdir(path.dirname(filePath))
    const fontsList: Array<fontInfo> = []
    videoInfo.fontsList = fontsList
    let fontsPath
    for (let index = 0; index < dirContent.length; index++) {
        const name = dirContent[index]
        if (/((\W|_)|^)fonts((\W|_)|$)/gim.test(name)) {
            fontsPath = path.resolve(path.dirname(filePath), name)
        }
    }
    let type
    try {
        var fileList = await readdir(fontsPath)
        type = 'dir'
    } catch (error) {
        type = 'file'
    }
    if (type == 'dir') {
        try {
            for (let index = 0; index < fileList.length; index++) {
                const file = path.resolve(fontsPath, fileList[index])
                try {
                    await copyFile(file, path.resolve(tempFontsDir, fileList[index]))
                    const font: fontInfo = {
                        name: path.basename(file, path.extname(file)),
                        url: `/api/v1/video/font/${path.basename(file)}`,
                    }
                    fontsList.push(font)
                } catch (error) {
                    console.log(error)
                }
            }
        } catch (error) {
            logger.error('handleFonts copyFile', error)
        }
    } else if ((type = 'file')) {
        if (cache === fontsPath && fontsPath) {
            const fontsPathList = await listPack(fontsPath)
            console.log('~~~~~~~~~~~~~~', fontsPathList, '~~~~~~~~~~~~~~')

            return Promise.resolve()
        } else {
            const fontsPathList = await extractAndList(fontsPath, tempFontsDir)
            for (let index = 0; index < fontsPathList.length; index++) {
                const fontPath = fontsPathList[index]
                try {
                    await copyFile(
                        path.resolve(tempFontsDir, fontPath),
                        path.resolve(tempFontsDir, path.basename(fontPath)),
                    )
                    const font: fontInfo = {
                        name: path.basename(fontPath, path.extname(fontPath)),
                        url: `/api/v1/video/font/${path.basename(fontPath)}`,
                    }
                    fontsList.push(font)
                } catch (error) {
                    console.log(error)
                }
            }
            cache = fontsPath
        }
    }
    return Promise.resolve()
}
export default handleFonts
