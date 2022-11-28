const { scrapeLogger } = require('../../../../utils/logger');
async function searchSeason(title, id) {
    let { got } = await import('got')
    // let res = await got.get(`https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURI(title)}`)
    let res = await got({
        url: `https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURI(title)}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'User-Agent': `fileServer for qbittorrent 0.4`
        },
        timeout: {
            request: 120000
        },
        responseType: 'json'
    })
    scrapeLogger.debug('searchSeason', res.body)
    res = res.body
    // console.log(id,res.animes,res.animes.find(v => v.animeId == id));
    if (res.animes) {
        if (id) {
            return res.animes.find(v => v.animeId == id)
        } else return res.animes[0]
    } else return false
}

module.exports = searchSeason