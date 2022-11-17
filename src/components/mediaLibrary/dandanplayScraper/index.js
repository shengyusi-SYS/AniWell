const path = require('path');
const { readdir, writeFile } = require('fs/promises');
const { scrapeLogger, logger } = require('../../../utils/logger');
const dandanplayMatch = require('./dandanplayMatch');
const fs = require('fs');
const { appedDirTree,getFileType } = require('../../../utils');
const {diffWords} = require('diff');

async function dandanplayScraper(dirPath) {
    try {
        let dirTree = await appedDirTree(dirPath,{},dandanplayMatch,computeCollection,async(filePath)=>await getFileType(filePath) == 'video')
        // console.log(dirTree);
        await writeFile('./test.json',JSON.stringify(dirTree,'','\t'))
        // scrapeLogger.debug('dandanplayScraper', dirTree);
        return dirTree
    } catch (error) {
        scrapeLogger.error('dandanplayScraper',error);
    }
}


async function computeCollection(dirTree){
    let countSeason = {}
    let tempSeasonTitle
    let tempCollectionTitle
    let countCollection={}
    let number = dirTree.children.length
    dirTree.children.forEach(v=>{
        if (v.fileInfo) {
            let info = v.fileInfo
            let seasonTitle = info.animeTitle
            if (!tempSeasonTitle&&number>1) {
                tempSeasonTitle = seasonTitle
            }else if (tempSeasonTitle) {
                seasonTitle = diffWords(tempSeasonTitle,seasonTitle)[0].value
                if (!countSeason[seasonTitle]) {
                    countSeason[seasonTitle]={id:info.animeId,num:1}
                }else countSeason[seasonTitle].num++
                tempSeasonTitle = seasonTitle
            } else {
                countSeason[seasonTitle]={id:info.animeId,num:1}
            }
            delete info.animeTitle
            delete info.animeId
            delete v.fileInfo
            Object.assign(v,info)
        }
        if (v.ddId) {
            let collectionTitle = v.title
            if (!tempCollectionTitle&&number>1) {
                tempCollectionTitle = collectionTitle
            }else if (tempCollectionTitle) {
                collectionTitle = diffWords(tempCollectionTitle,collectionTitle)[0].value
                if (!countCollection[collectionTitle]) {
                    countCollection[collectionTitle]={id:v.ddId,num:1}
                }else countCollection[collectionTitle].num++
                tempCollectionTitle = collectionTitle
            } else {
                countCollection[collectionTitle]={id:v.ddId,num:1}
            }
        }
    })
    let season = Object.entries(countSeason)
    if (season.length>0) {
        season = season.sort((a,b)=>b[1].num-a[1].num)[0]
        dirTree.title = season[0]
        dirTree.ddId = season[1].id
        let seasonInfo =  await searchSeason(dirTree.title,dirTree.ddId)
        delete seasonInfo.animeId
        delete seasonInfo.animeTitle
        delete seasonInfo.typeDescription
        delete seasonInfo.animeId
        delete seasonInfo.animeId
        Object.assign(dirTree,seasonInfo)
    }
    let collection = Object.entries(countCollection)
    if (collection.length>0) {
        collection = collection.sort((a,b)=>b[1].num-a[1].num)
        dirTree.title = collection[0][0]
        dirTree.seasons=countCollection
    }
    dirTree.children.sort((a,b)=>{
        if (a.episode&&b.episode) {
            return a.episode-b.episode
        }else if (a.startDate&&b.startDate) {
            return a.startDate-b.startDate
        }else return 0
    })
    // console.log(dirTree);
}

async function searchSeason(title,id) {
    let res  = await fetch(`https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURI(title)}`)
    res = await res.json()
    if (res.animes) {
        if (id) {
            return res.animes.find(v=>v.animeId==id)
        }else return res.animes[0]
    }else return false
  }

module.exports = dandanplayScraper