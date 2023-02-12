import Store from 'electron-store'
import paths from '@s/utils/envPath'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { test } from '@s/test'
import { toWebvtt } from '@s/utils/media/subConverter'

const store = new Store({
    name: 'subtitles',
    cwd: paths.cache,
    defaults: {
        uuid: 'path',
    },
})
class Subtitles {
    public store = store
    /**
     * add
     */
    public add({ id, path, source, codec, type }) {
        this.store.set(id, { path, source, codec, type })
        return this
    }
    /**
     * get
     */
    public async get(id, targetCodec) {
        const sub = this.store.get(id)
        const subCodec = sub.codec
        const subPath = resolve(sub.path)
        if (sub.source === 'out') {
            if (targetCodec === subCodec) {
                return readFile(subPath)
            } else if (!targetCodec || targetCodec === 'webvtt') {
                const src = await toWebvtt(subPath)
                return src
            } else {
                return { src: readFile(subPath), codec: subCodec }
            }
        } else {
            return ({ targetCodec, subPath }) => {
                //按指定格式提取内封字幕
            }
        }
    }
    /**
     * remove
     */
    public remove(id) {
        return this.store.delete(id)
    }
    /**
     * clear
     */
    public clear() {
        return this.store.clear()
    }
}
export default new Subtitles()
