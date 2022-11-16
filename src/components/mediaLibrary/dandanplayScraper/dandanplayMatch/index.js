const { vidoeHash, getFileType } = require('../../../../utils')
const { scrapeLogger } = require('../../../../utils/logger');

const path = require('path');
async function dandanplayMatch(filePath) {
    try {
        let fileName = path.parse(filePath).name
        if (await getFileType(filePath) != 'video') {
            return false
        }
        let hash = await vidoeHash(filePath)
        const headers = [
            ['Content-Type', 'application/json'],
        ];
        let form = {
            fileName: encodeURIComponent(fileName),
            fileHash: hash,
            matchMode: 'hashAndFileName',
        }
        let res = await fetch('https://api.dandanplay.net/api/v2/match', { headers, method: 'post', body: JSON.stringify(form) })
        res = await res.json()
        if (res.errorCode != 0) {
            scrapeLogger.error('dandanplayMatch res err', res.errorMessage)
        }
        if (res.success) {
            if (!res.isMatched) {
                res = {
                    hash,
                    matches: res.matches
                }
            }else{
                let result = res.matches[0]
                res = {
                    hash,
                    episode : result.episodeId-result.animeId*10000,
                    animeTitle :result.animeTitle,
                    animeId:result.animeId,
                    title :result.episodeTitle,
                    catagory : result.type
                }
            }
        }else res = false

        scrapeLogger.debug('dandanplayMatch res', res);
        return res
    } catch (error) {
        scrapeLogger.error('dandanplayMatch', error)
    }
}

module.exports = dandanplayMatch