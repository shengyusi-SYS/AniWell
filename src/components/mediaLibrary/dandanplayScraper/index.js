const path = require('path');
const { readdir, writeFile, readFile } = require('fs/promises');
const { scrapeLogger, logger } = require('../../../utils/logger');
const dandanplayMatch = require('./dandanplayMatch');
const computeCollection = require('./computeCollection');
const fs = require('fs');
const { appedDirTree, getFileType, TaskPool, deepMerge } = require('../../../utils');
// const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')


// parentPort.on('message',async libraryRootPath=>{
//     let res = await dandanplayScraper(libraryRootPath)
//     parentPort.postMessage(res)
//   })



// async function dandanplayScraper(libraryRootPath) {
//     try {
//         const taskQueue = new TaskPool(3)
//         let dirTree={}
//         let queue = []
//         let curList = await readdir(libraryRootPath)
//         curList.forEach(v => {
//             queue.push(new Promise(async (resolve, reject) => {
//                 let dirTask = async () => {
//                     return await appedDirTree(path.join(libraryRootPath, v), dirTree, {
//                         appendFileInfo: dandanplayMatch,
//                         appendDirInfo: computeCollection,
//                         fileFilter:async(filePath)=>{
//                             let res = await getFileType(filePath)
//                             return res=='video'
//                         }
//                     })
//                 }
//                 await taskQueue.task(dirTask)
//                 resolve()
//             }))
//         })
//         await Promise.all(queue)
//         await writeFile(path.resolve(libraryRootPath,'dirTree.json'),JSON.stringify(dirTree))
//         return dirTree
//     } catch (error) {
//         console.log(error);
//     }
// }

function searchLeaf(dirTree, targetPath) {
    let branch = targetPath.replace(path.resolve(dirTree.path) + path.sep, '').split(path.sep)
    let leaf = dirTree
    for (let index = 0; index < branch.length; index++) {
        const label = branch[index];
        leaf = leaf.children.find(v => v.label == label)
        if (!leaf) {
            return false
        }
    }
    return leaf
}

async function dandanplayScraper(libraryRootPath) {
    try {
        const taskQueue = new TaskPool(3)
        let existTree = { label: path.basename(libraryRootPath), path: libraryRootPath, children: [] }
        let fileFilter = async (filePath) => await getFileType(filePath) == 'video'
        try {
            existTree = JSON.parse(await readFile('./test.json'))
            if (existTree.children) {
                fileFilter = async (filePath) => {
                    let leaf = searchLeaf(existTree, filePath)
                    if (!leaf) {
                        return true
                    }
                    if (leaf.title) {
                        console.log('exist', leaf.label);
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
                            deepMerge(existTree, dirTree, {keyword:'label'})
                            await writeFile('./test.json', JSON.stringify(existTree, '', '\t'))
                        },
                        deep:1,
                        tag:{
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
        deepMerge(existTree, dirTree, {keyword:'label'})
        await writeFile('./test.json', JSON.stringify(existTree, '', '\t'))
        return existTree
    } catch (error) {

    }
}



module.exports = dandanplayScraper