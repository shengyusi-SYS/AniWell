const path = require('path');
const { readdir, writeFile, readFile } = require('fs/promises');
const { scrapeLogger, logger } = require('../../../utils/logger');
const dandanplayMatch = require('./dandanplayMatch');
const computeCollection = require('./computeCollection');
const fs = require('fs');
const { appedDirTree, getFileType, TaskPool, deepMerge,searchLeaf } = require('../../../utils');
// const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')


// parentPort.on('message',async libraryRootPath=>{
//     let res = await dandanplayScraper(libraryRootPath)
//     parentPort.postMessage(res)
//   })



async function dandanplayScraper(libraryRootPath, existTree,full=false,depth) {
    try {
        const taskQueue = new TaskPool(3)
        // existTree = { label: path.basename(libraryRootPath), path: libraryRootPath, children: [] }
        let fileFilter = async (filePath) => await getFileType(filePath) == 'video'
        try {
            if (!existTree) {
                existTree = { label: path.basename(libraryRootPath), path: libraryRootPath, children: [] }
            } else {
                if (!existTree.children) { existTree.children = [] }
                fileFilter = async (filePath) => {
                        // console.log('.........................', filePath);
                    let leaf = searchLeaf(existTree, filePath)
                    if (!leaf||full) {
                        return await getFileType(filePath) == 'video'
                    }
                    if (leaf.title) {
                        console.log('exist', leaf.label);
                        return false
                    }

                }
            }
        } catch (error) { }
        let dirTree = {
            label: path.basename(libraryRootPath),
            path: libraryRootPath,
            children: []
        }
        let queue = []
        let curList = await readdir(libraryRootPath)
        let tempList = []
        curList.forEach(v => {
            if (path.extname(v)!='.parts') {
                tempList.push(v)
            }
        })
        curList = tempList
        curList.forEach(v => {
            queue.push(new Promise(async (resolve, reject) => {
                let dirTask = async () => {
                    return await appedDirTree(path.join(libraryRootPath, v), {}, {
                        appendFileInfo: dandanplayMatch,
                        appendDirInfo: computeCollection,
                        fileFilter,
                        callback: async () => {
                            deepMerge(existTree, dirTree, { keyword: 'label' })
                            // await writeFile('./test.json', JSON.stringify(existTree, '', '\t'))
                        },
                        deep: depth?depth:1,
                        tag: {
                            existTree
                        }
                    })
                }
                let res = await taskQueue.task(dirTask)
                //    console.log('res-----------------',res);
                if (res) {
                    dirTree.children.push(res)
                }
                resolve()
            }))
        })
        await Promise.all(queue)
        deepMerge(existTree, dirTree, { keyword: 'label' })
        // await writeFile('./test.json', JSON.stringify(existTree, '', '\t'))
        // console.log('---------------------end',libraryRootPath);
        return existTree
    } catch (error) {

    }
}



module.exports = dandanplayScraper