const searchSeason = require('../searchSeason');
const { diffWords } = require('diff');
const path = require('path');
const mergeNfo = require('../../mergeNfo');
const grabResources = require('../../grabResources');
const { scrapeLogger } = require('../../../../utils/logger');
const { deepMerge, searchLeaf } = require('../../../../utils');
const { copyFile, access } = require('fs/promises');

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
        if (a.type != 'tvseries' && a.type != 'movie' && a.type != 'jpmovie') {
            return 1
        }
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
        if (dirTree.children[0].result=='episodedetails') {
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
            dirTree.poster = path.resolve(dirTree.path, 'folder.jpg')
            dirTree.result = 'tvshow'
            dirTree.source = 'dandan'
            collection = true
            try {
                await access(dirTree.poster)
            } catch (error) {
                try {
                    await copyFile(path.resolve(dirTree.children[0].path, 'folder.jpg'), path.resolve(dirTree.path, 'folder.jpg'))
                } catch (error) {
                }
            }
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
