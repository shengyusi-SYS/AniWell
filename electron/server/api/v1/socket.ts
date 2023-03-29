import users from '@s/store/users'
import { verifyToken } from '@s/utils/jwt'
import { clientLogger, syncLogger } from '@s/utils/logger'
import { Server } from 'socket.io'
import { scraperEvents } from '@s/modules/events'

class Io {
    io: Server
    init(server) {
        this.io = new Server(server)
        this.io.engine.on('initial_headers', (headers, req) => {
            headers['test'] = 'test'
        })

        this.io.on('connection', async (socket) => {
            const token = socket.handshake.headers?.cookie?.match(
                /refreshToken=(?<token>[^;]*)(;|$)/,
            ).groups.token
            if (token == undefined) return socket.disconnect()
            const info = verifyToken(token)
            if (info) {
                const user = users.getUser(info)
                socket.user = user
                if (!user) {
                    socket.disconnect()
                    return
                } else if (user.administrator) {
                    syncLogger.init(socket)
                    syncLogger.info('开始同步日志')
                    socket.on('clientLog', (...args) => {
                        clientLogger.info(args.join(' '))
                    })
                }
            } else return socket.disconnect()
            socket.emit('data', 'init')
        })

        setInterval(() => {
            this.io.emit('time', Date.now())
        }, 1000)

        this.pushProgress()
    }
    pushProgress() {
        scraperEvents.onProgress((progress) => {
            this.io.emit('progress', progress)
        })
    }
}

export default new Io()
