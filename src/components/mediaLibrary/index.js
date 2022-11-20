const dandanplayScraper = require('./dandanplayScraper')
const { readdir, access, writeFile, readFile } = require('fs/promises');
const fs = require('fs');
const { getFileType, TaskPool, appedDirTree } = require('../../utils');
const { scrapeLogger, logger } = require('../../utils/logger');
const path = require('path');
const { diffWords } = require('diff');
const xml2js = require('xml2js');
const { libraryIndex } = require('../../utils/init');

const xmlParser = new xml2js.Parser();
const xmlBuilder = new xml2js.Builder();

async function initMediaLibrary(libraryPath = '', libraryName = '') {
    try {
        if (!libraryName) {
            libraryName = path.basename(libraryPath)
        }
        let libraryRootDir = libraryPath
        console.log('libraryRootDir', libraryRootDir);
        let existTree = libraryIndex.children.find(v => v.label == libraryName)
        if (!existTree) {
            existTree = { label: libraryName, path: libraryRootDir, children: [] }
            libraryIndex.children.push(existTree)
        }
        let dandanplayResult = await dandanplayScraper(path.resolve(libraryRootDir), existTree)
        await writeFile('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
    } catch (error) {
        logger.error('initMediaLibrary', error)
    }
}

async function cleanLibrary() {
    await writeFile('./temp/libraryIndex_backup.json',libraryIndex)
    async function clean(dirTree){
      let queue=[]
          let tempChildren = []
          dirTree.children.forEach(v => {
            queue.push(new Promise(async(resolve, reject) => {
              try {
                let itemPath = path.resolve(dirTree.path, v.label)
                await access(itemPath)
                tempChildren.push(v)
                await clean(v)
            } catch (error) {}
            resolve()
            }))
          })
          dirTree.children = tempChildren
          await Promise.all(queue)
      }
      let allQueue = []
      libraryIndex.children.forEach(v=>{
        allQueue.push(clean(v))
      })
    await Promise.all(allQueue)
    await writeFile('./libraryIndex.json',JSON.stringify(libraryIndex,'','\t'))
  }

// async function readMediaLibrary(libraryPath) {
//     // let dirTree
//     // try {
//     //     dirTree = await readFile(path.resolve(libraryPath, 'dirTree.json'))
//     // } catch (error) {

//     // }
//     let curList = await readdir(libraryPath)
//     curList.forEach(async v => {
//         let contentList = await readdir(path.resolve(libraryPath, v))
//     })
// }

async function getLibraryRootDir(dirPath = '') {
    try {
        let libraryRootDir = ''
        let compared = false
        await appedDirTree(dirPath, {}, {
            fileFilter: async (filePath) => {
                let res = await getFileType(filePath)
                if (res == 'video') {
                    if (!libraryRootDir) {
                        libraryRootDir = path.dirname(filePath)
                    } else {
                        if (libraryRootDir != path.dirname(filePath)) {
                            libraryRootDir = diffWords(libraryRootDir, path.dirname(filePath))[0].value
                            compared = true
                        }
                    }
                    return true
                } else return false
            },
            appendFileInfo: buildEmptyNfo,
            // appendDirInfo:buildDirNfo
        })
        if (!compared) {
            libraryRootDir = path.dirname(libraryRootDir)
        }
        return libraryRootDir
    } catch (error) {
    }
}

async function buildEmptyNfo(filePath) {
    const nfoPath = path.resolve(path.dirname(filePath), `${path.parse(filePath).name}.nfo`)
    try {
        await readFile(nfoPath)
        console.log('has', nfoPath);
    } catch (error) {
        let emptyInfo = {
            episodedetails: {
                original_filename: path.basename(filePath),
            }
        }
        await writeFile(nfoPath, xmlBuilder.buildObject(emptyInfo))
    }
}


// async function initMediaLibrary(libraryPath = '') {
//     try {
//         console.log('start', libraryPath);
//         let libraryRootDir = await getLibraryRootDir(libraryPath)
//         if (libraryRootDir == '.') {
//             return false
//         }
//         console.log('libraryRootDir', libraryRootDir);
//         let dandanplayResult = await dandanplayScraper(path.resolve(libraryRootDir))
//         // console.log('dandanplayResult',dandanplayResult);
//         let mergeResult = mergeScrapeResult({
//             dandanplayResult,
//             tmdbResult: {},
//             config: {},
//         })
//         // console.log('mergeResult',mergeResult);
//         let res = await grabResources(mergeResult)
//         // console.log('grabResources',res);
//         await writeFile('./test.json', JSON.stringify(res, '', '\t'))
//     } catch (error) {
//     }
// }



module.exports = {initMediaLibrary,cleanLibrary}