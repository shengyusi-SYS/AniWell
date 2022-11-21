const dandanplayScraper = require('./dandanplayScraper')
const { readdir, access, writeFile, readFile } = require('fs/promises');
const fs = require('fs');
const { getFileType, TaskPool, appedDirTree, deepMerge, event,searchLeaf } = require('../../utils');
const { scrapeLogger, logger } = require('../../utils/logger');
const path = require('path');
const { diffWords, diffJson, diffArrays } = require('diff');
const xml2js = require('xml2js');
const { libraryIndex } = require('../../utils/init');

const xmlParser = new xml2js.Parser();
const xmlBuilder = new xml2js.Builder();
const taskQueue = new TaskPool(1)

event.on('addLibrary', (libraryPath, libraryName) => {
    taskQueue.task(async () => await initMediaLibrary(libraryPath, libraryName))
})

async function initMediaLibrary(libraryPath = '', libraryName = '') {
    try {
        // console.log('111111111111111111111',libraryPath);
        if (!libraryName) {
            libraryName = path.basename(libraryPath)
        }
        let libraryRootDir = libraryPath
        let existTree =searchLeaf(libraryIndex,libraryRootDir)
        if (!existTree) {
            existTree = { label: libraryName, path: libraryRootDir, children: [] }
            libraryIndex.children.push(existTree)
        }
        let dandanplayResult = await dandanplayScraper(path.resolve(libraryRootDir), existTree)
        await writeFile('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
        // console.log('222222222222222222222',libraryPath);
        return
    } catch (error) {
        logger.error('initMediaLibrary', error)
    }
}

async function cleanLibrary() {
    await writeFile('./temp/libraryIndex_backup.json', JSON.stringify(libraryIndex,'','\t'))
    async function clean(dirTree) {
        let queue = []
        let tempChildren = []
        dirTree.children.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                try {
                    let itemPath = path.resolve(dirTree.path, v.label)
                    await access(itemPath)
                    tempChildren.push(v)
                    await clean(v)
                } catch (error) { }
                resolve()
            }))
        })
        dirTree.children = tempChildren
        await Promise.all(queue)
    }
    let allQueue = []
    libraryIndex.children.forEach(v => {
        allQueue.push(clean(v))
    })
    await Promise.all(allQueue)
    await writeFile('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
}

const librarySettingsList = {
    library: {
        type: 'cellGroup', name: 'library', cells: [
            { name: '媒体库路径', value: '媒体库名' }
        ]
    }
    , source: {
        type: 'cellGroup', name: 'source', cells: [
            { type: 'radios', name: 'title', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'episode', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'poster', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'date', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'type', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'rating', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'hash', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { type: 'radios', name: 'season', value: 'dandan', radios: { dandan: { name: '弹弹Play', value: 'dandan' }, tmdb: { name: "TMDB", value: 'tmdb' }, local: { name: '本地', value: 'local' } } },
            { name: 'dandanplayId', value: 'dandanplayId' }
        ]
    }
}
var librarySettings = {}
try {
    librarySettings = JSON.parse(fs.readFileSync('./librarySettings.json'))
} catch (error) {
    for (const key in librarySettingsList) {
        if (librarySettingsList[key].type == 'cellGroup') {
            librarySettings[librarySettingsList[key].name] = {}
            for (const k in librarySettingsList[key].cells) {
                librarySettings[librarySettingsList[key].name][librarySettingsList[key].cells[k].name] = librarySettingsList[key].cells[k].value
            }
        } else if (librarySettingsList[key].name) {
            librarySettings[librarySettingsList[key].name] = librarySettingsList[key].value
        } else {
            librarySettings[key] = librarySettingsList[key]
        }
    }
}
function updateLibrarySettings(newSettings = librarySettings) {
    //检查媒体库路径
    for (const key in newSettings.library) {
        try {
            fs.accessSync(path.resolve(key))
        } catch (error) {
            return false
        }
        if (key != path.resolve(key)) {
            newSettings.library[path.resolve(key)] = newSettings.library[key]
            delete (newSettings.library[key])
        }

    }
    //检查删除
    let oldLibrary = librarySettings.library
    let newLibrary = newSettings.library
    let change = diffArrays(Object.keys(librarySettings.library), Object.keys(newSettings.library))
    // console.log(change);
    let added = change.filter(v => v.added).flatMap(v => v.value)
    let removed = change.filter(v => v.removed).flatMap(v => v.value)
    // console.log(added, removed);
    removed.forEach(pathVal => {
        if (oldLibrary[pathVal]) {
            let oldIndex = libraryIndex.children.findIndex(val => val.path == pathVal)
            if (oldIndex!=-1) {
                libraryIndex.children.splice(oldIndex, 1)
            }
            delete oldLibrary[pathVal]
        }
    })
    added.forEach(v => {
        event.emit('addLibrary', v, newLibrary[v])
    })
    // console.log(librarySettings);
    deepMerge(librarySettings, newSettings)

    libraryIndex.children.forEach(v => {
        if (librarySettings.library[v.path]) {
            // console.log(librarySettings.library[v.path]);
            v.label = librarySettings.library[v.path]
        }
    })
    console.log(libraryIndex);
    let newList = {}
    for (const key in librarySettings) {
        newList[key] = { cells: [] }
        for (const k in librarySettings[key]) {
            newList[key].cells.push({ name: k, value: librarySettings[key][k] })
        }
    }
    deepMerge(librarySettingsList, newList, { keyword: 'name' })
    try {
        fs.writeFileSync('./librarySettings.json', JSON.stringify(librarySettings, '', '\t'))
    } catch (error) { }
    try {
        fs.writeFileSync('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))

    } catch (error) {

    }
    return librarySettingsList
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



module.exports = { initMediaLibrary, cleanLibrary, librarySettings, librarySettingsList, updateLibrarySettings }