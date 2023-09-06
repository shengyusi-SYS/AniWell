import { parentPort } from "worker_threads"
import EasyEvents, { type Methods } from "../index"
import NamedPipe from "named-pipe"

const parent = new EasyEvents(parentPort!, {
    testa: async function ({ data }) {
        this.result("testa", {
            data: await new Promise(async (resolve, reject) => {
                const res = await this.invoke("testA", {})
                resolve(data + res.data + "world1")
            }),
        })
    },
})
export type workerMethods = (typeof parent)["methods"]

const socket = new EasyEvents(new NamedPipe("easy-events").connect(), {
    testa: async function ({ data }) {
        this.result("testa", {
            data: await new Promise(async (resolve, reject) => {
                const res = await this.invoke("testA", {})
                resolve(data + res.data + "world2")
            }),
        })
    },
})

socket.invoke("testB").then((res) => {
    console.log(res) //undefined
})

export type socketMethods = (typeof socket)["methods"]
