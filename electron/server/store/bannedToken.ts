import Store from 'electron-store'
import paths from '@s/utils/envPath'
import { verify } from '@s/utils/jwt'
const store = new Store({
    name: 'bannedToken',
    cwd: paths.cache,
    defaults: {
        t0: '',
    },
})
class BannedToken {
    public store = store
    /**
     * add
     */
    public add(token: string) {
        for (const token of this.store) {
            try {
                verify(token[1])
                console.log(token[1])
            } catch (error) {
                this.store.delete(token[0])
            }
        }
        this.store.set('t' + this.store.size, token)
        return this
    }
    /**
     * has
     */
    public has = (token: string) => {
        for (const t of this.store) {
            if (t[1] === token) {
                return true
            }
        }
        return false
    }
}
const bannedToken = new BannedToken()
export default bannedToken