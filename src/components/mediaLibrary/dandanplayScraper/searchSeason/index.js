const {scrapeLogger} = require('../../../../utils/logger');
async function searchSeason(title, id) {
    let {got} = await import('got')
    let res = await got.get(`https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURI(title)}`)
    res = JSON.parse(res.body)
    scrapeLogger.debug('searchSeason',res)
    // console.log(id,res.animes,res.animes.find(v => v.animeId == id));
    if (res.animes) {
        if (id) {
            return res.animes.find(v => v.animeId == id)
        } else return res.animes[0]
    } else return false
}

module.exports = searchSeason