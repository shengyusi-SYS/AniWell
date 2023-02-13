import Store from 'electron-store'
import paths from '@s/utils/envPath'
import { readFile } from 'fs/promises'

const store = new Store({
    name: 'fonts',
    cwd: paths.cache,
    defaults: {
        uuid: 'path',
    },
})
class Fonts {
    public store = store
    /**
     * add
     */
    public add({ name, path }) {
        this.store.set(name, path)
        return this
    }
    /**
     * get
     */
    public async get(id) {
        const fontPath = this.store.get(id)
        return readFile(fontPath)
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
export default new Fonts()
