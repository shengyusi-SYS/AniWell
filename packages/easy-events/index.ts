import type EventEmitter from 'events'
import type { Socket, Server } from 'net'
import type { Worker as NodeWorker, MessagePort as ParentPort } from 'worker_threads'

export interface DuplexEventEmitter {
    input: EventEmitter
    output: EventEmitter
    postMessage: (args: any) => void
    on: (eventName: 'data' | 'error', listener: (...args: any[]) => void) => void
    removeListener: (eventName: string, listener: (...args: any[]) => void) => void
}

type Channels =
    | [NodeWorker, 'NodeWorker']
    | [ParentPort, 'ParentPort']
    | [Socket, 'Socket']
    | [DuplexEventEmitter, 'Duplex']
    | [EventEmitter, 'EventEmitter']

function isNodeWorker(channel: Channels['0']): channel is NodeWorker {
    if (channel['performance']) return true
    else return false
}

function isSocket(channel: Channels['0']): channel is Socket {
    if (channel['write']) return true
    else return false
}
function isDuplex(channel: Channels['0']): channel is DuplexEventEmitter {
    if (channel['input'] && channel['output']) return true
    else return false
}
function isParentPort(channel: Channels['0']): channel is ParentPort {
    if (isNodeWorker(channel)) return false
    if (isDuplex(channel)) return false
    if (channel['postMessage']) return true
    else return false
}

function isEventEmitter(channel: Channels['0']): channel is EventEmitter {
    if (isNodeWorker(channel)) return false
    if (isSocket(channel)) return false
    if (isParentPort(channel)) return false
    if (channel['on'] && channel['emit'] && channel['listeners']) return true
    else return false
}

type dataType = Record<string, any>
type MsgTypes = {
    message: {
        type: 'message'
        message: string
    }
    data: {
        type: 'data'
        data: dataType
    }
    invoke: {
        type: 'invoke'
        invoke: keyof Exclude<EasyEvents['methods'], undefined>
        data?: dataType
    }
    result: {
        type: 'result'
        result: keyof Exclude<EasyEvents['methods'], undefined>
        data?: dataType
    }
}
type MsgType = MsgTypes[keyof MsgTypes]

type Fn = (...args: any[]) => void | Promise<void>
type Method = (this: EasyEvents, args: dataType) => void | Promise<void>
type Methods = Record<string, Method>

export default class EasyEvents<
    TtargetMethods extends Methods = Methods, //import from other instance's methods
    Tchannel extends Channels['0'] = Channels['0'],
    TselfMethods extends Methods = Methods,
> {
    channel: Tchannel
    methods?: TselfMethods
    constructor(channel: Tchannel, methods?: TselfMethods) {
        this.channel = channel
        if (methods) {
            this.methods = methods
            this.onInvoke()
        }
    }
    post(msg: MsgType) {
        const { channel } = this
        if (isNodeWorker(channel)) channel.postMessage(msg)
        else if (isParentPort(channel)) channel.postMessage(msg)
        else if (isSocket(channel)) channel.write(JSON.stringify(msg))
        else if (isDuplex(channel)) channel.postMessage(JSON.stringify(msg))
        else if (isEventEmitter(channel)) channel.emit('data', msg)
    }
    onData(cb: (data: MsgType) => void | Promise<void>) {
        const { channel } = this
        if (isNodeWorker(channel)) channel.on('message', (data) => cb(this.transform(data)))
        else if (isParentPort(channel)) channel.on('message', (data) => cb(this.transform(data)))
        else if (isSocket(channel)) channel.on('data', (data) => cb(this.transform(data)))
        else if (isDuplex(channel)) channel.on('data', (data) => cb(this.transform(data)))
        else if (isEventEmitter(channel)) channel.on('data', (data) => cb(this.transform(data)))
    }
    onError(cb: Fn) {
        const { channel } = this
        if (isNodeWorker(channel)) channel.on('error', cb)
        else if (isParentPort(channel)) channel.on('messageerror', cb)
        else if (isSocket(channel)) channel.on('error', cb)
        else if (isDuplex(channel)) channel.on('error', cb)
        else if (isEventEmitter(channel)) channel.on('error', cb)
    }
    removeDataListener(listener: Fn) {
        const { channel } = this
        if (isNodeWorker(channel)) channel.removeListener('message', listener)
        else if (isParentPort(channel)) channel.removeListener('message', listener)
        else if (isSocket(channel)) channel.removeListener('data', listener)
        else if (isDuplex(channel)) channel.removeListener('data', listener)
        else if (isEventEmitter(channel)) channel.removeListener('data', listener)
    }
    message(message: string) {
        this.post({ type: 'message', message })
    }
    json(data: dataType) {
        this.post({ type: 'data', data })
    }

    async invoke(invoke: Extract<keyof TtargetMethods, string>, params?: dataType) {
        return new Promise<dataType>((resolve, reject) => {
            const listener = (rawData: MsgType) => {
                if (rawData.type === 'result' && rawData.result === invoke) {
                    this.removeDataListener(listener)
                    resolve(this.parse(rawData))
                }
            }
            this.onData(listener)
            this.post({ type: 'invoke', invoke, data: params })
        })
    }
    onInvoke() {
        const invokeListener = async (rawData: MsgType) => {
            if (rawData.type === 'invoke' && this.methods) {
                const method = this.methods[rawData.invoke]
                if (method !== undefined) {
                    await method.call(this, rawData.data || {})
                } else {
                    // throw new Error("method not found")
                    console.log('method not found', rawData.invoke)
                }
            }
        }
        try {
            this.removeDataListener(invokeListener)
        } catch (error) {}
        this.onData(invokeListener)
    }

    result(result: Extract<keyof TselfMethods, string>, data?: dataType) {
        this.post({ type: 'result', result, data })
    }

    parse(data: MsgTypes['message']): string
    parse(data: MsgTypes[Exclude<keyof MsgTypes, 'message'>]): dataType
    parse(data: any): any {
        if (data.type === 'message') return data.message
        else return data.data
    }

    transform(data: string | object | Buffer) {
        if (data instanceof Uint8Array) {
            const str = data.toString()
            try {
                return JSON.parse(str)
            } catch (error) {
                return str
            }
        } else if (typeof data === 'string') {
            try {
                return JSON.parse(data)
            } catch (error) {
                return data
            }
        } else if (data instanceof Object) {
            return data
        }
    }
}
