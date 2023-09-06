import { createConnection, createServer } from "node:net"
import type { Server, Socket } from "node:net"
import { type as osType } from "os"
import pkg from "../../package.json"
export default class NamedPipe {
    path: string
    server?: Server
    client?: Socket
    constructor(id: string = pkg.name) {
        this.path = osType() === "Windows_NT" ? "\\\\.\\pipe\\" + id : "/tmp/" + id
    }
    serve(cb?: (Socket: Socket) => void) {
        const server = (this.server = createServer(cb))
        server.listen(this.path)
        process.once("exit", () => {
            server.close()
        })
        return server
    }
    connect() {
        try {
            const client = (this.client = createConnection(this.path))
            return client
        } catch (error) {
            throw new Error("error connecting" + error)
        }
    }
}
