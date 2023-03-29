import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata, LibraryStore } from '@s/store/library'
import { vidoeHash, getFileType } from '@s/utils'
import { scrapeLogger } from '@s/utils/logger'
import path, { basename } from 'path'
import fs from 'fs'
import got from 'got'
import settings from '@s/store/settings'
import init from '@s/utils/init'
import Scraper, { TaskProgressController } from '..'

type fileMetadata = FileMetadata & {
    baseInfo: AppendedMetadata
}

export function genarateOption(fileMetadata: fileMetadata) {
    const filePath = fileMetadata.baseInfo.path
    const fileHash = fileMetadata.baseInfo.hash
    const fileName = basename(filePath)

    if (fileHash) {
        var matchMode = 'hashAndFileName'
    } else {
        matchMode = 'fileNameOnly'
    }
    const opt = {
        url: `https://api.dandanplay.net/api/v2/match`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'User-Agent': init.APPNAME + ' ' + init.VERSION,
        },
        timeout: {
            request: 120000,
        },
        json: {
            fileName: encodeURIComponent(fileName),
            fileHash,
            matchMode,
        },
        responseType: 'json',
    }
    return opt
}

export async function match(fileMetadata: fileMetadata): Promise<ScraperResult> {
    try {
        const opt = genarateOption(fileMetadata)
        const res = await got(opt)
        const dandanResult = res.body
        // scrapeLogger.debug('dandanplayMatch dandanResult', dandanResult)
        let result: ScraperResult
        if (dandanResult.success) {
            //完全匹配的信息才会参与后续合集的识别，不完全匹配的留在matchs内，以后加入手动识别
            if (!dandanResult.isMatched) {
                result = {
                    type: 'anime',
                    matches: dandanResult.matches,
                }
            } else {
                const match = dandanResult.matches[0]
                result = {
                    episode: match.episodeId - match.animeId * 10000,
                    animeTitle: match.animeTitle,
                    animeId: match.animeId,
                    title: match.episodeTitle,
                    type: match.type,
                    season: match.episodeId - match.animeId * 10000 < 9000 ? 1 : 0,
                }
            }
        } else {
            scrapeLogger.error('dandanplayMatch dandanResult err', dandanResult.errorMessage)
            result = { type: '' }
        }

        return result
    } catch (error) {
        scrapeLogger.error('dandanplayMatch match', error)
        return {}
    }
}

export default async function scraper(library: LibraryStore['']) {
    const progressController: TaskProgressController = this.progressController
    if (progressController) {
        progressController.setStage({
            stageName: 'fileSraper',
            stageTotal: Object.keys(library.flatFile).length,
        })
    }
    const flatFile = library.flatFile
    const queryList = []
    let i = 0
    for (const filePath in flatFile) {
        try {
            if (progressController) {
                progressController.setCurrent({ currentId: i++, currentName: filePath })
            }
            if (queryList.length >= 32) {
                await Promise.allSettled(queryList)
                queryList.length = 0
            }
            const fileMetadata = flatFile[filePath]
            fileMetadata.scraperInfo = fileMetadata.scraperInfo || {}
            if (
                !fileMetadata.scraperInfo?.['dandan'] ||
                fileMetadata.scraperInfo['dandan'].matches
            ) {
                queryList.push(
                    new Promise<void>(async (resolve, reject) => {
                        const fileMetadata = flatFile[filePath]
                        const scraperData = await match(fileMetadata)

                        fileMetadata.scraperInfo['dandan'] = scraperData
                        resolve()
                    }),
                )
            }
        } catch (error) {
            scrapeLogger.error('fileSraper', error)
        }
    }

    await Promise.allSettled(queryList)
    queryList.length = 0
}
