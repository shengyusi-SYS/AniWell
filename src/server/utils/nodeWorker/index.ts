import type { Worker } from "worker_threads"

export type eventData = { [key: string]: unknown }
export type eventMessage = { event: string; data?: eventData }
export function invokeEvent(emitter: Worker) {
    return function (event: string, data?: eventData) {
        return new Promise<eventData>((resolve, reject) => {
            emitter.postMessage({ event, data })
            const cb = (msg: eventMessage) => {
                if (msg.event === event) {
                    if (msg.data == undefined) resolve({})
                    else resolve(msg.data)
                    emitter.removeListener("message", cb)
                }
            }
            emitter.on("message", cb)
        })
    }
}
