
const xml2js = require('xml2js');
const xmlParser = new xml2js.Parser({ explicitArray: false, explicitRoot: false });
const xmlBuilder = new xml2js.Builder();
const fs = require('fs');
const { deepMerge } = require('../../../utils');
const path = require('path');
const dandanList = {
    'title': 'title',
    'episode': 'episode',
    'imageUrl': 'poster',
    'startDate': 'date',
    'type': 'type',
    'rating': 'rating',
    animeTitle: 'title',
    hash: 'hash',
    season: 'season',
    poster: 'poster',
    ddId: 'dandanplayId'
}

const config = {
    title: 'dandan',
    episode: 'dandan',
    poster: 'dandan',
    date: 'dandan',
    type: 'dandan',
    rating: 'dandan',
    hash: 'dandan',
    season: 'dandan',
    dandanplayId: 'dandanplayId',
}

function mergeNfo(filePath = '', res = {}) {
    // console.log(res);
    let nfoPath = path.resolve(path.dirname(filePath), `${path.parse(filePath).name}.nfo`)
    if (res.result == 'tvshow') {
        nfoPath = path.resolve(filePath, 'tvshow.nfo')
    } else if (res.result == 'season') {
        nfoPath = path.resolve(filePath, 'season.nfo')
        try {
            fs.renameSync(path.resolve(filePath, 'tvshow.nfo'), nfoPath)
        } catch (error) {
        }
    }
    let exist
    try {
        exist = fs.readFileSync(nfoPath)
        xmlParser.parseString(exist, (err, result) => {
            if (err) {}
            exist = result
        })
    } catch (error) {exist = {} }
    if (res.result == 'episodedetails') {
        try {
            let posterPath = path.resolve(path.dirname(filePath), 'metadata', `${path.parse(filePath).name}.jpg`)
            fs.accessSync(posterPath)
            exist.poster = posterPath
        } catch (error) {
        }
    }
    // console.log(exist);

    let srcList
    switch (res.source) {
        case 'dandan':
            srcList = dandanList
            break;
        case 'tmdb':
            break
    }
    let result = {}
    for (const key in (res.fileInfo ? res.fileInfo : res)) {
        try {
            let infoName = srcList[key]
            if (config[infoName] == res.source) {
                result[infoName] = (res.fileInfo ? res.fileInfo : res)[key]
            }
        } catch (error) {
        }
    }

    deepMerge(exist, result,{keyword:'name'})
    if (res.result) {
        let temp = {}
        temp[res.result] = exist
        result = temp
    }
    // console.log(result);
    result = xmlBuilder.buildObject(result)
    fs.writeFileSync(nfoPath, result)
    return result
}

module.exports = mergeNfo