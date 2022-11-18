const searchSeason = require('../searchSeason');
const { diffWords } = require('diff');

async function computeCollection(dirTree) {
    // console.log(dirTree);
    let countSeason = {}
    let tempSeasonTitle
    let tempCollectionTitle
    let countCollection = {}
    let number = dirTree.children.length
    dirTree.children.forEach(v => {
        if (v.fileInfo && !v.fileInfo.matches) {
            let info = v.fileInfo
            let seasonTitle = info.animeTitle
            if (!tempSeasonTitle && number > 1) {
                tempSeasonTitle = seasonTitle
            } else if (tempSeasonTitle) {
                seasonTitle = diffWords(tempSeasonTitle, seasonTitle)[0].value
                if (!countSeason[seasonTitle]) {
                    countSeason[seasonTitle] = { id: info.animeId, num: 1 }
                } else countSeason[seasonTitle].num++
                tempSeasonTitle = seasonTitle
            } else {
                countSeason[seasonTitle] = { id: info.animeId, num: 1 }
            }
            delete info.animeTitle
            delete info.animeId
            delete v.fileInfo
            Object.assign(v, info)
        }
        if (v.ddId && number < 10) {
            let collectionTitle = v.title
            if (!tempCollectionTitle && number > 1) {
                tempCollectionTitle = collectionTitle
            } else if (tempCollectionTitle) {
                collectionTitle = diffWords(tempCollectionTitle, collectionTitle)[0].value
                if (!countCollection[collectionTitle]) {
                    countCollection[collectionTitle] = { id: v.ddId, num: 1 }
                } else {
                    if (v.ddId < countCollection[collectionTitle].id) {
                        countCollection[collectionTitle].id = v.ddId
                    }
                    countCollection[collectionTitle].num++
                }
                tempCollectionTitle = collectionTitle
            } else {
                countCollection[collectionTitle] = { id: v.ddId, num: 1 }
            }
        }
    })
    let season = Object.entries(countSeason)
    if (season.length > 0) {
        season = season.sort((a, b) => b[1].num - a[1].num)[0]
        dirTree.title = season[0]
        dirTree.ddId = season[1].id
        let seasonInfo = {}
        try {
            seasonInfo = await searchSeason(dirTree.title, dirTree.ddId)
        } catch (error) {
            console.log('seasonInfo err', seasonInfo, error);
        }
        try {
            delete seasonInfo.animeId
            delete seasonInfo.animeTitle
            delete seasonInfo.typeDescription
            delete seasonInfo.animeId
            delete seasonInfo.animeId
        } catch (error) {
            console.log('seasonInfo err delete', seasonInfo);
        }
        Object.assign(dirTree, seasonInfo)
    }
    let collection = Object.entries(countCollection)
    if (collection.length > 0) {
        collection = collection.sort((a, b) => b[1].num - a[1].num)
        dirTree.title = collection[0][0]
        dirTree.seasons = countCollection
    }
    dirTree.children.sort((a, b) => {
        if (a.episode && b.episode) {
            return a.episode - b.episode
        } else if (a.startDate && b.startDate) {
            return a.startDate - b.startDate
        } else return 0
    })
    // if (number==0) {
    //     delete dirTree.path
    // }
    // fs.writeFileSync(path.resolve(dirTree.path,'dirTree.json'),JSON.stringify(dirTree,'','\t'))
    // console.log(dirTree);
}

module.exports  = computeCollection