import { AppendedMetadata } from './filterAndAppend'
import { ScraperResult, FileMetadata } from '@s/store/library'
import { vidoeHash, getFileType } from '@s/utils'
import { scrapeLogger } from '@s/utils/logger'
import path, { basename } from 'path'
import fs from 'fs'
import got from 'got'
import settings from '@s/store/settings'
import init from '@s/utils/init'

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
    const opt = genarateOption(fileMetadata)
    const res = await got(opt)
    const dandanResult = res.body
    scrapeLogger.debug('dandanplayMatch dandanResult', dandanResult)
    if (dandanResult.errorCode != 0) {
        scrapeLogger.error('dandanplayMatch dandanResult err', dandanResult.errorMessage)
    }
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
    } else result = { type: '' }

    return result
}

export default async function scraper(library) {
    const flatFile = library.flatFile
    const queryList = []
    for (const filePath in flatFile) {
        if (queryList.length >= 100) {
            await Promise.allSettled(queryList)
            queryList.length = 0
        }
        queryList.push(
            new Promise<void>(async (resolve, reject) => {
                const fileMetadata = flatFile[filePath]
                const scraperData = await match(fileMetadata)
                fileMetadata.scraperInfo = fileMetadata.scraperInfo || {}
                fileMetadata.scraperInfo['dandan'] = scraperData
                resolve()
            }),
        )
    }
    await Promise.allSettled(queryList)
    queryList.length = 0
}
