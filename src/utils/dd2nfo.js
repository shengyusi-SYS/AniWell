const fs = require('fs');
const xml2js = require('xml2js');
const util = require('util');
const path = require('path');
var got
import('got').then((result) => {
    got = result.default
})
var noticed = false
function dd2nfo(dandanplayPath, fullUpdate = false, overwrite = false) {
    console.log('开始转化媒体库',dandanplayPath,fullUpdate,overwrite);
    if (!dandanplayPath) {
        return Promise.reject('未检测到弹弹Play')
    }
    try {
        var library = JSON.parse(fs.readFileSync(path.resolve(dandanplayPath, 'library.json'))).VideoFiles
    } catch (error) {
        return Promise.reject('未检测到弹弹Play')
    }
    try {
        var libraryIndex = JSON.parse(fs.readFileSync('./libraryIndex.json'))
        console.log('已读取匹配数据');
    } catch (error) {
        libraryIndex = { allSeason: {}, episodes: {}, collections: {} }
    }
    let tempL = {}
    library.forEach(v => {
        tempL[v.Path] = JSON.parse(JSON.stringify(v))
    })
    library = tempL
    try {
        var backup = JSON.parse(fs.readFileSync('./temp/backup.json'))
    } catch (error) {
        fs.writeFileSync('./temp/backup.json', JSON.stringify(library, '', '\t'))
        backup = {}
    }
    var parser = new xml2js.Parser();
    var builder = new xml2js.Builder();
    // parser.parseString(nfo,(err,res)=>{
    // console.log(util.inspect(res, false, null))
    // })
    let dropped = {}
    for (const ap in backup) {
        if (!library[ap]) {
            dropped[ap] = backup[ap]
            delete backup[ap]
        }
    }
    let update = {}
    console.log(fullUpdate);
    if (!fullUpdate) {
        console.log('增量更新');
        for (const ap in library) {
            if (!backup[ap]||(backup[ap].EpisodeId!=library[ap].EpisodeId)) {
                update[ap] = library[ap]
            }
        }
    } else {
        console.log("全量更新");
        update = library
    }
    try {
        backup = library
        fs.writeFileSync('./temp/dropped.json', JSON.stringify(dropped, '', '\t'))
        fs.writeFileSync('./temp/update.json', JSON.stringify(update, '', '\t'))
        fs.writeFileSync('./temp/backup.json', JSON.stringify(backup, '', '\t'))
    } catch (error) { }

    let season = {}
    for (const ap in update) {
        let anime = update[ap]
        let obj = {
            episodedetails: {
                title: anime.EpisodeTitle,
                art: [
                    {
                        poster: [
                            path.resolve(dandanplayPath, 'Cache', 'LibraryImage', `${anime.Hash}.jpg`)
                        ]
                    }
                ],
                showtitle: anime.AnimeTitle,
                season: anime.EpisodeId - anime.AnimeId * 10000 < 9000 ? 1 : 0,
                episode: anime.EpisodeId - anime.AnimeId * 10000,
                id: anime.Id,
                uniqueid: [{ _: '', '$': { default: 'false', type: 'dandanplay' } }],
                dateadded: anime.IncludeTime,
                original_filename: anime.Name,
            }
        }
        if (!overwrite) {
            if (!noticed) {
                console.log('合并更新');
                noticed = true
            }
            let oldNfo, newNfo
            try {
                oldNfo = fs.readFileSync(path.resolve(path.dirname(anime.Path), `${path.parse(anime.Name).name}.nfo`))
                delete obj.episodedetails.uniqueid
                if (oldNfo.episodedetails&&oldNfo.episodedetails.art) {
                    delete obj.episodedetails.art
                }
                parser.parseString(oldNfo, (err, res) => {
                   Object.assign(res.episodedetails, obj.episodedetails)
                   newNfo = res
                })
                let xml = builder.buildObject(newNfo);
                fs.writeFileSync(path.resolve(path.dirname(anime.Path), `${path.parse(anime.Name).name}.nfo`), xml)
            } catch (error) {
                console.log(error);
                let xml = builder.buildObject(obj);
                fs.writeFileSync(path.resolve(path.dirname(anime.Path), `${path.parse(anime.Name).name}.nfo`), xml)
            }
        } else {
            if (!noticed) {
                console.log('覆写更新');
                noticed = true
            }
            let xml = builder.buildObject(obj);
            fs.writeFileSync(path.resolve(path.dirname(anime.Path), `${path.parse(anime.Name).name}.nfo`), xml)
        }
        if (!season[path.dirname(anime.Path)]) {
            season[path.dirname(anime.Path)] = {
                tvshow: {
                    title: anime.AnimeTitle,
                    runtime: 1,
                    art: [
                        {
                            poster: path.resolve(path.dirname(anime.Path), 'poster.jpg')
                        }
                    ],
                    season: 1,
                    episode: -1,
                }
            }
            // if (anime.AnimeTitle.includes('第二季')) {
            //     obj.episodedetails.season = 2
            //     season[path.dirname(anime.Path)].tvshow.season = 2
            // }else if (anime.AnimeTitle.includes('第三季')) {
            //     obj.episodedetails.season = 3
            //     season[path.dirname(anime.Path)].tvshow.season = 3
            // }else if (anime.AnimeTitle.includes('第四季')) {
            //     obj.episodedetails.season = 4
            //     season[path.dirname(anime.Path)].tvshow.season = 4
            // }
        } else {
        }
    }

    let allSeason = {}
    for (const ap in library) {
        let anime = library[ap]
        let poster
        if (!allSeason[path.dirname(anime.Path)]) {
            try {
                fs.statSync(path.resolve(path.dirname(anime.Path), 'poster.jpg'))
                poster = path.resolve(path.dirname(anime.Path), 'poster.jpg')
            } catch (error) {
                try {
                fs.statSync(path.resolve(path.dirname(anime.Path), 'folder.jpg'))
                poster = path.resolve(path.dirname(anime.Path), 'folder.jpg')
                } catch (error) {
                    
                }
            }
            allSeason[path.dirname(anime.Path)] = {
                title: anime.AnimeTitle,
                poster,
                id:anime.AnimeId
            }
        }
        libraryIndex.episodes[ap]={
            poster:path.resolve(path.parse(ap).dir,'metadata', `${path.parse(ap).name}.jpg`),
            title:anime.EpisodeTitle,
            episode:anime.EpisodeId - anime.AnimeId * 10000,
            seasonTitle:anime.AnimeTitle,
            seasonPoster:poster
        }
        try {
            libraryIndex.episodes[ap].seasonPoster = allSeason[path.dirname(anime.Path)].poster
        } catch (error) {
            console.log(error,ap);
        }

    }
    try {
        fs.writeFileSync('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
        console.log('已更新索引');
    } catch (error) {
        
    }

    let searchQueue = []
    let pathQueue = []
    for (const aniPath in season) {
        let tv = builder.buildObject(season[aniPath])
        fs.writeFileSync(path.resolve(aniPath, `tvshow.nfo`), tv)
        // fs.writeFileSync(path.resolve(aniPath, `season.nfo`), tv)
        let task = got({
            url: `https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURIComponent(season[aniPath].tvshow.title)}`
            , method: 'get'
        }).then((result) => {
            result = JSON.parse(result.body)
            if (result.animes[0]) {
                return result.animes[0].imageUrl
            }
        }).catch((err) => {
            console.log(err);
            return false
        });
        searchQueue.push(task)
        pathQueue.push(path.resolve(aniPath, 'poster.jpg'))
    }
    return Promise.all(searchQueue).catch((err) => {
        console.log(err);
    }).then((res) => {
        let downloadQueue = []
        res.forEach(url => {
            if (url) {
                let task = got({
                    url,
                    method: 'get',
                    responseType: "buffer"
                }).then((result) => {
                    return result.body
                }).catch((err) => {
                    return false
                });
                downloadQueue.push(task)
            } else {
                downloadQueue.push(Promise.resolve(false))
            }
        })
        return Promise.all(downloadQueue)
    }).catch((err) => {
        console.log(err);
    }).then(pictures => {
        pictures.forEach((v, k) => {
            if (v) {
                fs.writeFileSync(pathQueue[k], v)
            }
        })
        console.log('nfo更新完成');
        return allSeason
    })
}

module.exports = dd2nfo
