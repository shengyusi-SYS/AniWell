const searchSeason = require('../searchSeason');
const { diffWords } = require('diff');
const path = require('path');
const mergeNfo = require('../../mergeNfo');
const grabResources = require('../../grabResources');
const { scrapeLogger } = require('../../../../utils/logger');
const { deepMerge,searchLeaf } = require('../../../../utils');

async function computeCollection(dirTree = { children: [] }, deep, tag) {

    // console.log(dirTree);
    // let countSeason = {}
    // let tempSeasonTitle
    // let tempCollectionTitle
    // let countCollection = {}
    // let episodes = []
    // let seasons = []
    // let number = dirTree.children.length
    // console.log('1111111111111111111111111',deep,dirTree.label,dirTree.children);
    let collection = false
    if (tag.existTree.children.length > 0) {
        let existDirTree = searchLeaf(tag.existTree, path.resolve(dirTree.path))
        deepMerge(dirTree, existDirTree, { keyword: 'label', depthLimit: 2 })
        // console.log(dirTree);
    }

    dirTree.children.sort((a, b) => {
        if (a.episode || a.startDate || a.ddId) {
            if (b.episode || b.startDate || b.ddId) {
                return Boolean(a.episode - b.episode) ? (a.episode - b.episode) :
                    (a.startDate && b.startDate) ? (a.startDate < b.startDate ? -1 : 1) :
                        Boolean(a.ddId - b.ddId) ? (a.ddId - b.ddId) : 1
            } else return -1
        } else return 1
    })
    // console.log('2222222222222222222222222',deep,dirTree.children);


    //判断番名、季度
    if (dirTree.children[0]) {
        if (dirTree.children[0].animeTitle) {
            dirTree.title = dirTree.children[0].animeTitle
            dirTree.ddId = dirTree.children[0].animeId
            dirTree.type = dirTree.children[0].type
            dirTree.result = 'tvshow'
            dirTree.source = 'dandan'
            dirTree.children.forEach(v => {
                delete v.animeTitle
                delete v.animeId
                delete v.type
            })
            let seasonInfo = {}
            try {
                seasonInfo = await searchSeason(dirTree.title, dirTree.ddId)
                // console.log(seasonInfo);
            } catch (error) {
                scrapeLogger.error('computeCollection seasonInfo err', dirTree.title, error)
            }
            try {
                delete seasonInfo.animeId
                delete seasonInfo.animeTitle
                delete seasonInfo.typeDescription
            } catch (error) {
                scrapeLogger.error('computeCollection seasonInfo err delete', seasonInfo, error)
            }
            Object.assign(dirTree, seasonInfo)
        } else if (dirTree.children.find(v => v.result == 'episodedetails') && deep != 0) {
            dirTree.result = 'tvshow'
        }
        if (dirTree.children[0].ddId && deep != 0) {
            dirTree.title = dirTree.children[0].title
            dirTree.startDate = dirTree.children[0].startDate
            dirTree.ddId = dirTree.children[0].ddId
            dirTree.poster = dirTree.children[0].poster
            dirTree.result = 'tvshow'
            dirTree.source = 'dandan'
            collection = true
            dirTree.children.forEach((v, i) => {
                if (v.result == 'tvshow') {
                    v.result = 'season'
                    v.season = i + 1
                }
                if (v.children) {
                    v.children.forEach((val, ind) => {
                        if (val.result == 'episodedetails') {
                            val.season = i + 1
                        }
                    })
                }
            })
        }
    }

    // dirTree.children.forEach(v => {
    //     if (v.fileInfo && !v.fileInfo.matches) {
    //         let info = v.fileInfo
    //         let seasonTitle = info.animeTitle
    //         // let episode = JSON.parse(JSON.stringify(v.fileInfo))
    //         // episodes.push(episode)

    //         if (!tempSeasonTitle && number > 1) {
    //             tempSeasonTitle = seasonTitle
    //         } else if (tempSeasonTitle) {
    //             seasonTitle = diffWords(tempSeasonTitle, seasonTitle)[0].value
    //             if (!countSeason[seasonTitle]) {
    //                 countSeason[seasonTitle] = { id: info.animeId, num: 1 }
    //             } else countSeason[seasonTitle].num++
    //             tempSeasonTitle = seasonTitle
    //         } else {
    //             countSeason[seasonTitle] = { id: info.animeId, num: 1 }
    //         }
    //         delete info.animeTitle
    //         delete info.animeId
    //         delete v.fileInfo
    //         Object.assign(v, info)
    //     }
    //     if (v.ddId && number < 10) {
    //         let collectionTitle = v.title
    //         let season = JSON.parse(JSON.stringify(v))
    //         delete season.children
    //         seasons.push(season)
    //         if (!tempCollectionTitle && number > 1) {
    //             tempCollectionTitle = collectionTitle
    //         } else if (tempCollectionTitle) {
    //             collectionTitle = diffWords(tempCollectionTitle, collectionTitle)[0].value
    //             if (!countCollection[collectionTitle]) {
    //                 countCollection[collectionTitle] = { id: v.ddId, num: 1 }
    //             } else {
    //                 if (v.ddId < countCollection[collectionTitle].id) {
    //                     countCollection[collectionTitle].id = v.ddId
    //                 }
    //                 countCollection[collectionTitle].num++
    //             }
    //             tempCollectionTitle = collectionTitle
    //         } else {
    //             countCollection[collectionTitle] = { id: v.ddId, num: 1 }
    //         }
    //     }
    // })
    // let season = Object.entries(countSeason)
    // if (season.length > 0) {
    //     season = season.sort((a, b) => b[1].num - a[1].num)[0]
    //     dirTree.title = season[0]
    //     dirTree.ddId = season[1].id
    //     dirTree.result = 'tvshow'//需修正
    //     dirTree.source = 'dandan'
    //     let seasonInfo = {}
    //     try {
    //         seasonInfo = await searchSeason(dirTree.title, dirTree.ddId)
    //     } catch (error) {
    //         console.log('seasonInfo err', seasonInfo, error);
    //     }
    //     try {
    //         delete seasonInfo.animeId
    //         delete seasonInfo.animeTitle
    //         delete seasonInfo.typeDescription
    //     } catch (error) {
    //         console.log('seasonInfo err delete', seasonInfo);
    //     }
    //     Object.assign(dirTree, seasonInfo)
    // }
    // let collection = Object.entries(countCollection)
    // if (collection.length > 0) {
    //     collection = collection.sort((a, b) => b[1].num - a[1].num)
    //     dirTree.title = collection[0][0]
    //     dirTree.seasons = seasons
    //     dirTree.poster = dirTree.children.find(v => v.ddId == collection[0][1].id).poster
    //     dirTree.result = 'tvshow'
    //     dirTree.source = 'dandan'
    // }
    // dirTree.children.sort((a, b) => {
    //     if (a.episode && b.episode) {
    //         return a.episode - b.episode
    //     } else if (a.startDate && b.startDate) {
    //         return a.startDate - b.startDate
    //     } else return 0
    // })
    // console.log(dirTree);
    try {
        if (dirTree.imageUrl) {
            let posterPath = await grabResources(dirTree.path, dirTree.imageUrl.replace('_medium', ''))
            if (posterPath) {
                dirTree.poster = posterPath
                delete dirTree.imageUrl
            }
        }
    } catch (error) {
        scrapeLogger.error('computeCollection grabResources', error)
    }
    // if (!path.extname(dirTree.label)&&dirTree.label.includes('')) {
    //     console.log('-----------',dirTree);
    // }
    if (dirTree.result) {
        if (collection) {
            dirTree.children.forEach(v => {
                if (v.children) {
                    v.children.forEach(val => {
                        if (!val.children) {
                            mergeNfo(path.resolve(v.path, val.label), val)
                        }
                    })
                }
                mergeNfo(v.path, v)
            })
        }
        mergeNfo(dirTree.path, dirTree)
    }
    // if (number==0) {
    //     delete dirTree.path
    // }
    // fs.writeFileSync(path.resolve(dirTree.path,'dirTree.json'),JSON.stringify(dirTree,'','\t'))
    // console.log(dirTree);
}

module.exports = computeCollection
