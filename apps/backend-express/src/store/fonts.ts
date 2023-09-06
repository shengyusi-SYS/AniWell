import Store from 'conf'
import paths from '@s/utils/envPath'
import { access, copyFile, mkdir, readdir, readFile, rm } from 'fs/promises'
import path, { basename, dirname, join } from 'path'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import { extractAndList, listPack } from '@s/utils'
import { mkdirSync, statSync } from 'fs'

export interface fontInfo {
    name: string
    url: string
}

const tempFontsDir = path.resolve(paths.temp, 'fonts')
try {
    mkdirSync(tempFontsDir)
} catch (error) {}

const store = new Store({
    configName: 'fonts',
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
    async get(boxPath: string): Promise<fontInfo[]> {
        const fontsList = this.store.get(boxPath) as fontInfo[]
        try {
            for (const { name } of fontsList) {
                const fontPath = join(tempFontsDir, basename(boxPath), name)
                await access(fontPath)
            }
            return fontsList
        } catch (error) {
            logger.info('rescan fonts', boxPath)
            return await this.scan(boxPath)
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
        try {
            logger.debug('fontsStore scan start')
            const fontsList: fontInfo[] = []
            const dirContent = await readdir(boxPath)
            const possibleFontsPaths: string[] = []
            for (let index = 0; index < dirContent.length; index++) {
                const name = dirContent[index]
                if (/((\W|_)|^)fonts((\W|_)|$)/gim.test(name)) {
                    possibleFontsPaths.push(path.resolve(boxPath, name))
                }
            }

            logger.debug('fontsStore scan possibleFontsPaths', possibleFontsPaths)
            for (let index = 0; index < possibleFontsPaths.length; index++) {
                try {
                    const possibleFontsPath = possibleFontsPaths[index]

                    let fontsFileList: string[]
                    if (statSync(possibleFontsPath).isDirectory()) {
                        const fileNameList = await readdir(possibleFontsPath)
                        fontsFileList = fileNameList!.map((fileName) =>
                            path.resolve(possibleFontsPath, fileName),
                        )
                    } else if (statSync(possibleFontsPath).isFile()) {
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
                            fontsFileList = []
                            logger.error('fontsStore extractAndList', error)
                        }
                    } else {
                        logger.error('possibleFontsPath is not file or dir', possibleFontsPath)
                        break
                    }

                    logger.debug('fontsStore scan fontsFileList', fontsFileList)
                    const boxFontsPath = path.resolve(paths.temp, 'fonts', path.basename(boxPath))
                    try {
                        await mkdir(boxFontsPath)
                    } catch (error) {}
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
                            logger.error('fontsStore scan copyFile', error)
                        }
                    }
                } catch (error) {
                    logger.error(
                        'fontsStore scan error possibleFontsPaths',
                        possibleFontsPaths,
                        error,
                    )
                }
            }
            this.add(boxPath, fontsList)
            return fontsList
        } catch (error) {
            logger.error('fontsStore scan error')
            return []
        }
    }
}
export default new Fonts()
