// import { parentPort } from 'worker_threads'
const { parentPort } = require("worker_threads")
parentPort.on("message", (event) => {
    console.log(event)

    parentPort.postMessage("get")
})

// import('worker_threads')
//     .then(async (result) => {
//         const { parentPort } = result
//         parentPort.on('message', (event) => {
//             console.log(event)

//             parentPort.postMessage(new Error('err'))
//         })
//         return import('@s/utils/media')
//     })
//     .then((result) => {
//         console.log(result)
//     })
//     .catch((err) => {})
