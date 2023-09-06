import Store from 'conf'
import paths from '@s/utils/envPath'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { toWebvtt, extractSub } from '@s/utils/media'
import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
} from '@s/utils/logger'
import { subInfo } from '@s/modules/video/task/handleSubtitles'

const store = new Store({
    configName: 'subtitles',
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
    public async get({
        id,
        targetCodec,
        index,
    }: {
        id: string
        targetCodec: string
        index: number
    }) {
        try {
            const sub = this.store.get(id) as subInfo
            const subCodec = sub.codec
            const subPath = resolve(sub.path)
            if (sub.source === 'out') {
                if (targetCodec === subCodec) {
                    return await readFile(subPath)
                } else if (!targetCodec || targetCodec === 'webvtt') {
                    const src = await toWebvtt(subPath)
                    return src
                } else {
                    return await readFile(subPath)
                }
            } else {
                return await extractSub({ targetCodec, subPath, subIndex: index })
            }
        } catch (error) {
            logger.error('get sub error', error)
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
