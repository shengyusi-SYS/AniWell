const dandanplayScraper = require('./dandanplayScraper')
const { readdir } = require('fs/promises');
const fs = require('fs');
const { getFileType } = require('../../utils');
const path = require('path');
function initMediaLibrary(libraryPath = []) {
    libraryPath.forEach(async v => {
        let libraryRootDir = await getLibraryRootDir(v)
        console.log(libraryRootDir);
    })
}

let findMedia = false
async function getLibraryRootDir(dirPath = '') {
    try {
        console.log('111');
        if (findMedia) {
            return
        }
        let curList = await readdir(dirPath)
        let queue = []
        curList.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                let newPath = path.join(dirPath, v)
                // console.log(newPath);

                let res = await getFileType(newPath)
                console.log(res);
                if (res == 'video') {
                    findMedia = path.dirname(dirPath)
                } else {
                    try {
                        await getLibraryRootDir(newPath)
                    } catch (error) {
                    }
                }
                console.log('423432');
                resolve()
            }))
        })
        await Promise.all(queue)
        console.log('222');
        return findMedia
    } catch (error) {
    }
}

module.exports = initMediaLibrary