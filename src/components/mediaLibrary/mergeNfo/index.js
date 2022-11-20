
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
    if (!filePath || filePath == '.') {
        return false
    }
    let nfoPath
    let posterPath
    switch (res.result) {
        case 'episodedetails':
            nfoPath = path.resolve(path.dirname(filePath), `${path.parse(filePath).name}.nfo`)
            try {
                fs.accessSync(path.resolve(path.dirname(filePath), 'metadata', `${path.parse(filePath).name}.jpg`))
                posterPath = path.resolve(path.dirname(filePath), 'metadata', `${path.parse(filePath).name}.jpg`)
            } catch (error) { }
            break;
        case 'tvshow':
            nfoPath = path.resolve(filePath, 'tvshow.nfo')
            try {
                fs.accessSync(path.resolve(filePath, `folder.jpg`))
                posterPath = path.resolve(filePath, `folder.jpg`)
            } catch (error) {
                try {
                    fs.accessSync(path.resolve(filePath, `poster.jpg`))
                    posterPath = path.resolve(filePath, `poster.jpg`)
                } catch (error) {
                }
            }
            break;
        case 'season':
            nfoPath = path.resolve(filePath, 'season.nfo')
            try {
                fs.renameSync(path.resolve(filePath, 'tvshow.nfo'), nfoPath)
            } catch (error) { }
            try {
                fs.accessSync(path.resolve(filePath, `folder.jpg`))
                posterPath = path.resolve(filePath, `folder.jpg`)
            } catch (error) {
                try {
                    fs.accessSync(path.resolve(filePath, `poster.jpg`))
                    posterPath = path.resolve(filePath, `poster.jpg`)
                } catch (error) { }
            }
            break
        default:
            // try {
            //     fs.accessSync(path.resolve(filePath, 'tvshow.nfo'))
            //     nfoPath = path.resolve(filePath, 'tvshow.nfo')
            // } catch (error) {
            //     try {
            //         fs.accessSync(path.resolve(filePath, 'season.nfo'))
            //         nfoPath = path.resolve(filePath, 'season.nfo')
            //     } catch (error) {
            //     }
            // }
            // try {
            //     fs.accessSync(path.resolve(filePath, `folder.jpg`))
            //     posterPath = path.resolve(filePath, `folder.jpg`)
            // } catch (error) {
            //     try {
            //         fs.accessSync(path.resolve(filePath, `poster.jpg`))
            //         posterPath = path.resolve(filePath, `poster.jpg`)
            //     } catch (error) { }
            // }
            // console.log('--------------------------',filePath);
            break
    }

    if (posterPath) {
        res.poster = posterPath
    }

    let exist
    try {
        exist = fs.readFileSync(nfoPath)
        xmlParser.parseString(exist, (err, result) => {
            if (err) { }
            if (result) {
                exist = result
            } else exist = {}
        })
    } catch (error) { exist = {} }

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
    if (res.result == 'episodedetails') {
        result.original_filename = path.basename(filePath)
    }

    deepMerge(exist, result, { keyword: 'name' })
    if (res.result) {
        let temp = {}
        temp[res.result] = exist
        result = temp
    }
    // if (!path.extname(filePath)) {
    //     console.log('-----------',filePath,posterPath);
    // }
    result = xmlBuilder.buildObject(result)
    if (nfoPath) {
        fs.writeFileSync(nfoPath, result)
    }
    return result
}

module.exports = mergeNfo