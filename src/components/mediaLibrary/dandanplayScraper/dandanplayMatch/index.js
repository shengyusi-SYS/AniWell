const { vidoeHash, getFileType } = require('../../../../utils')
const { scrapeLogger } = require('../../../../utils/logger');
const path = require('path');
const fs = require('fs');
const mergeNfo = require('../../mergeNfo');
async function dandanplayMatch(filePath,tag) {
    try {
        let fileName = path.parse(filePath).name
        let hash = ''
        let matchMode
        if (filePath) {
            if (await getFileType(filePath) != 'video') {
                return false
            }
            hash = await vidoeHash(filePath)
            matchMode = 'hashAndFileName'
        } else {
            matchMode = 'fileNameOnly'
        }
        let form = {
            fileName: encodeURIComponent(fileName),
            fileHash: hash,
            matchMode,
        }
        let { got } = await import('got')
        let res = await got({
            url: `https://api.dandanplay.net/api/v2/match`,
            method: 'POST',
            headers: {
                'Content-Type': 'text/json',
                'Accept': 'application/json',
                'Accept-Encoding':'gzip',
                'User-Agent':`fileServer for qbittorrent 0.4`
            },
            timeout: {
                request: 120000
            },
            body: JSON.stringify(form),
            responseType: 'json'
        })
        res = res.body
        scrapeLogger.info('dandanplayMatch res', res)
        if (res.errorCode != 0) {
            scrapeLogger.error('dandanplayMatch res err', res.errorMessage)
        }
        if (res.success) {
            //完全匹配的信息才会参与后续合集的识别，不完全匹配的留在matchs内，以后加入手动识别
            if (!res.isMatched) {
                res = {
                    source: 'dandan',
                    result: 'episodedetails',
                    hash,
                    matches: res.matches
                }
            } else {
                let result = res.matches[0]
                res = {
                    source: 'dandan',
                    result: 'episodedetails',
                    hash,
                    episode: result.episodeId - result.animeId * 10000,
                    animeTitle: result.animeTitle,
                    animeId: result.animeId,
                    title: result.episodeTitle,
                    type: result.type,
                    season: result.episodeId - result.animeId * 10000 < 9000 ? 1 : 0
                }
            }
        } else res = false
        if (res) {
            await  mergeNfo(filePath, res,tag)
        }
        scrapeLogger.debug('dandanplayMatch res', fileName, res);
        return res
    } catch (error) {
        scrapeLogger.error('dandanplayMatch', filePath, error)
        return false
    }
}



module.exports = dandanplayMatch