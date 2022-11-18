const path = require('path');
const { readdir, writeFile, readFile } = require('fs/promises');
const { scrapeLogger, logger } = require('../../../utils/logger');
const dandanplayMatch = require('./dandanplayMatch');
const computeCollection = require('./computeCollection');
const fs = require('fs');
const { appedDirTree, getFileType, Concurrently,deepMerge } = require('../../../utils');
// const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')


// parentPort.on('message',async libraryRootPath=>{
//     let res = await dandanplayScraper(libraryRootPath)
//     parentPort.postMessage(res)
//   })


var taskQueue = new Concurrently(3)

async function dandanplayScraper(libraryRootPath) {
    try {
        let existTree = { label: path.basename(libraryRootPath), path: libraryRootPath, children: [] }
        let fileFilter = async (filePath) => await getFileType(filePath) == 'video'
        try {
            existTree = JSON.parse(await readFile('./test.json'))
            if (existTree.children) {
                fileFilter = async (filePath) => {
                    let branch = filePath.replace(path.dirname(existTree.path) + '\\', '').split(path.sep)
                    let leaf = existTree
                    for (let index = 1; index < branch.length; index++) {
                        const label = branch[index];
                        leaf = leaf.children.find(v => v.label == label)
                        if (!leaf) {
                            return true
                        }
                    }
                    if (leaf.title) {
                        console.log('exist');
                        return false
                    }
                    return await getFileType(filePath) == 'video'
                }
            } else {
                existTree = { label: path.basename(libraryRootPath), path: libraryRootPath, children: [] }
            }
        } catch (error) { }
        let dirTree = {
            label: path.basename(libraryRootPath),
            path: libraryRootPath,
            children: []
        }
        let queue = []
        let curList = await readdir(libraryRootPath)
        curList.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                let dirTask = async () => {
                    return await appedDirTree(path.join(libraryRootPath, v), {}, {
                        appendFileInfo: dandanplayMatch,
                        appendDirInfo: computeCollection,
                        fileFilter,
                        callback: async () => {
                            deepMerge(existTree, dirTree,true)
                            await writeFile('./test.json', JSON.stringify(existTree, '', '\t'))
                        }
                    })
                }
                let res = await taskQueue.task(dirTask)
                //    console.log('res-----------------',res);
                if (res.type != 'file') {
                    dirTree.children.push(res)
                }
                resolve()
            }))
        })
        await Promise.all(queue)
        deepMerge(existTree, dirTree,true)
        await writeFile('./test.json', JSON.stringify(existTree, '', '\t'))
    } catch (error) {

    }
}




module.exports = dandanplayScraper