import { users } from '@s/store/users'
type accessNames = 'admin' | 'test'
interface userInfo {
    username?: string
    UID?: string
}
class Auth {
    constructor() {}
    /**
     * hasAccess
     */
    public hasAccess(UID: string, accessName: accessNames): boolean {
        const user = users.getUser({ UID })
        if (user === false) {
            return false
        } else {
            if (accessName === 'admin') {
                return user.administrator
            } else {
                return Boolean(user.access[accessName])
            }
        }
    }
    /**
     * isAdmin
     */
    public isAdmin(userInfo: userInfo): boolean {
        const { username, UID } = userInfo
        if (UID) {
            return this.hasAccess(UID, 'admin')
        } else if (username) {
            const user = users.getUser({ username })
            if (user === false) {
                return false
            } else {
                return user.administrator
            }
        } else {
            return false
        }
    }
}
const auth = new Auth()
export default auth
