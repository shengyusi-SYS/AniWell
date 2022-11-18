const {scrapeLogger} = require('../../../../utils/logger');
async function searchSeason(title, id) {
    let res = await fetch(`https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURI(title)}`)
    res = await res.json()
    scrapeLogger.debug('searchSeason',res)
    if (res.animes) {
        if (id) {
            return res.animes.find(v => v.animeId == id)
        } else return res.animes[0]
    } else return false
}

module.exports = searchSeason