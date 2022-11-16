const path = require('path');
const { readdir, writeFile } = require('fs/promises');
const { scrapeLogger, logger } = require('../../../utils/logger');
const dandanplayMatch = require('./dandanplayMatch');
const fs = require('fs');
const { appedDirTree,getFileType } = require('../../../utils');
async function dandanplayScraper(dirPath) {
    try {
        let dirTree = await appedDirTree(dirPath,{},dandanplayMatch,computeCollection,async(filePath)=>await getFileType(filePath) == 'video')
        // console.log(dirTree);
        // await writeFile('./test.json',JSON.stringify(dirTree,'','\t'))
        scrapeLogger.debug('dandanplayScraper', dirTree);
    } catch (error) {
        scrapeLogger.error('dandanplayScraper',error);
    }
}

async function computeCollection(dirTree){
    let count = {}
    dirTree.children.forEach(v=>{
        if (v.fileInfo) {
            let info = v.fileInfo
            if (!count[info.animeTitle]) {
                count[info.animeTitle]={id:info.animeId,num:0}
            }else count[info.animeTitle].num++
            delete info.animeTitle
            delete info.animeId
            delete v.fileInfo
            Object.assign(v,info)
        }
    })
    let collection = Object.entries(count)
    if (collection.length>0) {
        collection = collection.sort((a,b)=>b[1].num-a[1].num)[0]
        dirTree.title = collection[0]
        dirTree.ddId = collection[1].id
    }
    let collectionInfo =  await searchCollection(dirTree.title,dirTree.ddId)
    delete collectionInfo.animeId
    delete collectionInfo.animeTitle
    delete collectionInfo.typeDescription
    delete collectionInfo.animeId
    delete collectionInfo.animeId
    Object.assign(dirTree,collectionInfo)
}

async function searchCollection(title,id) {
    let res  = await fetch(`https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURI(title)}`)
    res = await res.json()
    if (res.animes) {
        if (id) {
            return res.animes.find(v=>v.animeId==id)
        }else return res.animes[0]
    }else return false
  }

module.exports = dandanplayScraper