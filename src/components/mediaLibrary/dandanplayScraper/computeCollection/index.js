const searchSeason = require('../searchSeason');
const { diffWords } = require('diff');
const path = require('path');
const grabResources = require('../../grabResources');
const { scrapeLogger } = require('../../../../utils/logger');
const { deepMerge, searchLeaf } = require('../../../../utils');
const { copyFile, access } = require('fs/promises');
const mergeNfo = require('../../mergeNfo');

console.log('computeCollection');

async function computeCollection(dirTree = { children: [] }, deep, tag) {
    let collection = false

    //将已有信息合并，避免增量更新时，因过滤器导致相关信息缺失
    if (tag.existTree.children.length > 0) {
        let existDirTree = searchLeaf(tag.existTree, path.resolve(dirTree.path))
        deepMerge(dirTree, existDirTree, { keyword: 'label', depthLimit: 2 })
    }

    //对单集信息进行排序，将正片内容提前，以排序后的文件夹中第一个正片为准，设置当前文件夹的季度/番名/合集信息
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


    //根据排序后的children判断番名、季度
    if (dirTree.children[0]) {
        //由单集信息episodedetails判断季度/番名
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
        } else if (dirTree.children.find(v => v.result == 'episodedetails') && deep != 0) {//当弹弹play无法识别当前文件夹下所有内容，且文件夹内有视频时，将当前文件夹设为tvshow，防止遗漏和错误（处理弹弹play无法识别的情况）
            dirTree.result = 'tvshow'
        }

        //如果当前目录下有番剧，且不是媒体库根目录（深度不为0），则将当前目录设为合集，并对目录下相关信息进行修正
        if (dirTree.children[0].ddId && deep != 0) {
            dirTree.title = dirTree.children[0].title
            dirTree.startDate = dirTree.children[0].startDate
            dirTree.ddId = dirTree.children[0].ddId
            dirTree.poster = path.resolve(dirTree.children[0].path, 'folder.jpg')
            dirTree.result = 'tvshow'
            dirTree.source = 'dandan'
            collection = true

            //处理合集海报图，方便jellyfin等识别
            try {
                await access(path.resolve(dirTree.path, 'folder.jpg'))
                dirTree.poster = path.resolve(dirTree.path, 'folder.jpg')
            } catch (error) {
                try {
                    await copyFile(path.resolve(dirTree.children[0].path, 'folder.jpg'), path.resolve(dirTree.path, 'folder.jpg'))
                    dirTree.poster = path.resolve(dirTree.path, 'folder.jpg')
                } catch (error) {
                }
            }
            //修正当前目录下的季度信息
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

    //根据imageUrl信息抓取海报图
    try {
        if (dirTree.imageUrl) {
            let posterPath = await grabResources(dirTree.path, dirTree.imageUrl.replace('_medium', ''))//弹弹默认给的图片地址留了一手:-)
            if (posterPath) {
                dirTree.poster = posterPath
                delete dirTree.imageUrl
            }
        }
    } catch (error) {
        scrapeLogger.error('computeCollection grabResources', error)
    }

    //根据识别结果合并nfo文件
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
}

module.exports = computeCollection
