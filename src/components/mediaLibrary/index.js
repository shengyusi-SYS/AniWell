const dandanplayScraper = require('./dandanplayScraper')
const { readdir, access, writeFile, readFile } = require('fs/promises');
const fs = require('fs');
const { getFileType, TaskPool, appedDirTree } = require('../../utils');
const { scrapeLogger } = require('../../utils/logger');
const path = require('path');
const { diffWords } = require('diff');
const xml2js = require('xml2js');

const xmlParser = new xml2js.Parser();
const xmlBuilder = new xml2js.Builder();

async function initMediaLibrary(libraryPath = '') {
    try {
        // console.log('start', libraryPath);
        // let libraryRootDir = await getLibraryRootDir(libraryPath)
        // if (libraryRootDir == '.') {
        //     return false
        // }
        let libraryRootDir =libraryPath
        console.log('libraryRootDir', libraryRootDir);
        let dandanplayResult = await dandanplayScraper(path.resolve(libraryRootDir))
        // console.log(dandanplayResult);

        // await writeFile('./test.json', JSON.stringify(res, '', '\t'))
    } catch (error) {
    }
}

async function readMediaLibrary(libraryPath) {
    // let dirTree
    // try {
    //     dirTree = await readFile(path.resolve(libraryPath, 'dirTree.json'))
    // } catch (error) {

    // }
    let curList = await readdir(libraryPath)
    curList.forEach(async v => {
       let contentList= await readdir(path.resolve(libraryPath,v))
       ['tvshow.nfo','season.nfo','']
       if (contentList.includes()) {
        
       }
    })
}

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

async function buildDirNfo(dirTree) {
    const nfoPath = path.resolve(dirTree.path, 'tvshow.nfo')
    try {
        await readFile(nfoPath)
        // console.log('has',nfoPath);
    } catch (error) {
        let emptyInfo = {
            tvshow: {
                path: path.basename(dirTree.path),
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


// async function grabResources(dirTree, basePath, overwrite) {
//     let { got } = await import('got')
//     let rootPath
//     basePath ? rootPath = basePath : rootPath = dirTree.path
//     let queue = []
//     dirTree.children.forEach(v => {
//         queue.push(new Promise(async (resolve, reject) => {
//             let dirPath = path.resolve(rootPath, v.label)
//             let existPoster = false
//             if (!overwrite) {
//                 try {
//                     await access(path.resolve(dirPath, `folder.jpg`))
//                     v.poster = path.resolve(dirPath, `folder.jpg`)
//                     existPoster = true
//                 } catch (error) {
//                     try {
//                         await access(path.resolve(dirPath, `poster.jpg`))
//                         v.poster = path.resolve(dirPath, `poster.jpg`)
//                         existPoster = true
//                     } catch (error) {
//                     }
//                 }
//             }
//             if (overwrite || !existPoster) {
//                 try {
//                     let url = v.imageUrl
//                     if (url) {
//                         let task = await got({
//                             url,
//                             method: 'get',
//                             responseType: "buffer"
//                         })
//                         let res = task.body
//                         await writeFile(path.resolve(dirPath, `folder.jpg`), res)
//                         v.poster = path.resolve(dirPath, `folder.jpg`)
//                         scrapeLogger.debug('grabResources', dirPath)
//                     }
//                 } catch (error) {
//                     scrapeLogger.error('grabResources', error)
//                 }
//             }
//             if (v.children) {
//                 await grabResources(v, dirPath)
//             }
//             resolve()
//         }))
//     })
//     await Promise.all(queue)
//     return dirTree
// }

// const dandanList = {
//     titleSrc: 'title',
//     episodeSrc: 'episode',
//     posterSrc: 'imageUrl',
//     dateSrc: 'startDate',
//     typeSrc: 'type',
//     rateSrc: 'rating',
// }

// const defaultMergeParams = {
//     dandanplayResult: {},
//     tmdbResult: {},
//     config: {
//         titleSrc: 'dandan',
//         episodeSrc: 'dandan',
//         posterSrc: 'dandan',
//         dateSrc: 'dandan',
//         typeSrc: 'dandan',
//         rateSrc: 'dandan',
//     }
// }
// function mergeScrapeResult(params) {
//     params.config = { ...defaultMergeParams.config, ...params.config }
//     params = { ...defaultMergeParams, ...params }
//     let { dandanplayResult, tmdbResult, config } = params
//     return dandanplayResult
// }

// let taskQueue = new TaskPool(10)


module.exports = initMediaLibrary