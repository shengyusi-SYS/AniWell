const { vidoeHash, getFileType } = require('../../../../utils')
const { scrapeLogger } = require('../../../../utils/logger');

const path = require('path');
async function dandanplayMatch(filePath,params={}) {
    try {
        let {selectedName,nameFilter}=params
        if (!filePath&&!selectedName) {
            return false
        }
        !selectedName?selectedName='':''
        !nameFilter?nameFilter=(fileName)=>{return fileName}:''
        let fileName = selectedName||nameFilter(path.parse(filePath).name)
        let hash=''
        let matchMode
        if (filePath) {
            if (await getFileType(filePath) != 'video') {
                return false
            }
            hash = await vidoeHash(filePath)
            matchMode = 'hashAndFileName'
        }else{
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
                'Accept': 'application/json'
            },
            timeout: {
                request: 120000
            },
            body: JSON.stringify(form),
            responseType: 'json'
        })
        res = res.body
        if (res.errorCode != 0) {
            scrapeLogger.error('dandanplayMatch res err', res.errorMessage)
        }
        if (res.success) {
            if (!res.isMatched) {
                res = {
                    hash,
                    matches: res.matches
                }
            } else {
                let result = res.matches[0]
                res = {
                    hash,
                    episode: result.episodeId - result.animeId * 10000,
                    animeTitle: result.animeTitle,
                    animeId: result.animeId,
                    title: result.episodeTitle,
                    catagory: result.type
                }
            }
        } else res = false

        scrapeLogger.debug('dandanplayMatch res', fileName, res);
        return res
    } catch (error) {
        scrapeLogger.error('dandanplayMatch', filePath, error)
        return false
    }
}



module.exports = dandanplayMatch