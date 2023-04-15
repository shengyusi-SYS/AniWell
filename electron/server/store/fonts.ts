import Store from 'electron-store'
import paths from '@s/utils/envPath'
import { copyFile, mkdir, readdir, readFile, rm } from 'fs/promises'
import path, { basename } from 'path'
import { logger } from '@s/utils/logger'
import { extractAndList, listPack } from '@s/utils'
import { mkdirSync } from 'fs'

export interface fontInfo {
    name: string
    url: string
}

const tempFontsDir = path.resolve(paths.temp, 'fonts')
try {
    mkdirSync(tempFontsDir)
} catch (error) {}

const store = new Store({
    name: 'fonts',
    cwd: paths.cache,
    defaults: {} as { [boxPath: string]: fontInfo[] },
})
class Fonts {
    public store = store
    /**
     * add
     */
    public add(boxPath: string, fontsList: fontInfo[]) {
        this.store.set(boxPath, fontsList)
        return this
    }
    /**
     * get
     */
    public get(boxPath: string): fontInfo[] {
        try {
            return this.store.get(boxPath)
        } catch (error) {
            return undefined
        }
    }
    /**
     * remove
     */
    public remove(boxPath: string) {
        return this.store.delete(boxPath)
    }
    /**
     * clear
     */
    public clear() {
        return this.store.clear()
    }

    /**
     * scan
     */
    public async scan(boxPath: string) {
        const fontsList: fontInfo[] = []
        // const boxFileList = []
        // const boxDirList = []
        // await filterDirFile(boxPath,{fileList:boxFileList,dirList:boxDirList})
        // const matchList = [...boxFileList,...boxDirList]
        const dirContent = await readdir(boxPath)
        const possibleFontsPaths = []
        for (let index = 0; index < dirContent.length; index++) {
            const name = dirContent[index]
            if (/((\W|_)|^)fonts((\W|_)|$)/gim.test(name)) {
                possibleFontsPaths.push(path.resolve(boxPath, name))
            }
        }

        for (let index = 0; index < possibleFontsPaths.length; index++) {
            try {
                const possibleFontsPath = possibleFontsPaths[index]

                let type
                let fileNameList: string[]
                try {
                    fileNameList = await readdir(possibleFontsPath)
                    type = 'dir'
                } catch (error) {
                    type = 'file'
                }

                let fontsFileList: string[]
                if (type === 'dir') {
                    fontsFileList = fileNameList.map((fileName) =>
                        path.resolve(possibleFontsPath, fileName),
                    )
                } else if (type === 'file') {
                    const tempFontsDir = path.resolve(paths.temp, 'fonts', 'extract')
                    try {
                        await rm(tempFontsDir, { recursive: true })
                    } catch (error) {}
                    try {
                        await mkdir(tempFontsDir)
                    } catch (error) {}
                    try {
                        fontsFileList = await extractAndList(possibleFontsPath, tempFontsDir)
                    } catch (error) {
                        logger.error('handleFonts extractAndList', error)
                    }
                }

                const boxFontsPath = path.resolve(paths.temp, 'fonts', path.basename(boxPath))
                try {
                    await mkdir(boxFontsPath)
                } catch (error) {}
                logger.info('fontsFileList', fontsFileList)
                for (let index = 0; index < fontsFileList.length; index++) {
                    try {
                        const fontFilePath = fontsFileList[index]
                        const fontFileName = basename(fontFilePath)
                        const fontPath = path.resolve(boxFontsPath, fontFileName)
                        await copyFile(fontFilePath, fontPath)
                        const font: fontInfo = {
                            name: fontFileName,
                            url: `/api/v1/video/font/${path.basename(boxPath)}/${fontFileName}`,
                        }
                        fontsList.push(font)
                    } catch (error) {
                        logger.error('handleFonts copyFile', error)
                    }
                }
            } catch (error) {
                logger.error('handleFonts error possibleFontsPaths', possibleFontsPaths, error)
            }
        }
        this.add(boxPath, fontsList)
        return fontsList
    }
}
export default new Fonts()
