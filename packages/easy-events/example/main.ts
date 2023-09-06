import worker from "./worker?worker&url"
import EasyEvents from "../index"
import { Worker } from "worker_threads"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { type workerMethods } from "./worker"
import NamedPipe from "named-pipe"

const main = new EasyEvents<workerMethods>(
    new Worker(join(dirname(fileURLToPath(import.meta.url)), worker)),
    {
        testA: function () {
            this.result("testA", { data: "-" })
        },
    },
)
main.invoke("testa", { data: "hellow" }).then((result) => {
    console.log(result.data) //'hellow-world1'
})

new NamedPipe("easy-events").serve(async (socket) => {
    const server = new EasyEvents(socket, {
        testA: function () {
            this.result("testA", { data: "-" })
        },
        testB: function () {
            this.result("testB")
        },
    })
    const result2 = await server.invoke("testa", { data: "hellow" })
    console.log(result2.data) //'hellow-world2'
})
