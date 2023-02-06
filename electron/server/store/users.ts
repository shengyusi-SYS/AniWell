import path from 'path'
import paths from '@s/utils/envPath'
import Store from 'electron-store'
import { TransformConfig, Simple, Complex } from '@s/utils/transformConfig'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import bannedToken from '@s/store/bannedToken'

export interface UsersData extends Simple {
    users: {
        [username: string]: {
            username: string
            UID?: string
            password: string
            alias?: string
            salt: string
            administrator?: boolean
            access?: {
                [accessName: string]: boolean
            }
        }
    }
}
export type UserData = UsersData['users']['username']
const usersList: Complex = {
    users: {
        name: 'users',
        type: 'cellGroup',
        cells: [
            {
                name: 'admin',
                type: 'cellGroup',
                cells: [
                    {
                        name: 'UID',
                        type: 'UID',
                        value: 'UID',
                    },
                    {
                        name: 'password',
                        type: 'password',
                        value: 'adminUser',
                        private: true,
                    },
                    {
                        name: 'alias',
                        type: 'text',
                        value: '初始管理员',
                    },
                    {
                        name: 'salt',
                        type: 'salt',
                        value: 'salt',
                        private: true,
                    },
                    {
                        name: 'administrator',
                        type: 'boolean',
                        value: true,
                        private: true,
                    },
                    {
                        name: 'access',
                        type: 'cellGroup',
                        cells: [
                            {
                                name: 'test',
                                type: 'access',
                                value: true,
                            },
                        ],
                    },
                ],
            },
        ],
    },
}
interface UserInfo {
    username?: string
    UID?: string
}
class Users {
    public store: Store<UsersData>
    public transformer: TransformConfig
    public first: boolean
    constructor() {
        this.transformer = new TransformConfig(usersList)
        const defaults = JSON.parse(JSON.stringify(this.transformer.simple)) as unknown as UsersData
        this.store = new Store({
            name: 'users',
            cwd: paths.config,
            defaults,
        })
        try {
            const defaultSalt = this.store.get('users.admin.salt')
            const defaultPassword = this.store.get('users.admin.password')
            const defaultUID = this.store.get('users.admin.UID')
            let newSalt: string
            let count = 0
            if (defaultSalt === 'salt') {
                newSalt = bcrypt.genSaltSync(10)
                this.store.set('users.admin.salt', newSalt)
                count++
            }
            if (defaultPassword === 'adminUser') {
                const passwordHash = bcrypt.hashSync(defaultPassword, newSalt)
                const savedPassword = bcrypt.hashSync(passwordHash, 10)
                this.store.set('users.admin.password', savedPassword)
                count++
            }
            if (defaultUID === 'UID') {
                this.store.set('users.admin.UID', uuidv4())
                count++
            }
            this.first = count === 3

            if (this.first === true) {
                this.firstSignUp = async (userData: UserData) => {
                    this.store.delete('users.admin')
                    userData.password = await bcrypt.hash(userData.password, 10)
                    this.addUser(this.newUserData(userData, true))
                }
            }
        } catch (error) {}
    }
    /**
     * get
     */
    public get(target: string): any {
        return this.store.get(target)
    }
    /**
     * set
     */
    public set(key: string, value: unknown): this {
        this.store.set(key, value)
        return this
    }
    /**
     * data
     */
    public data(): UsersData {
        return this.store.store
    }
    /**
     * getUser
     */
    public getUser(userInfo: UserInfo): UsersData['users']['username'] | false {
        try {
            const { username, UID } = userInfo
            if (UID) {
                const users: UsersData['users'] = this.get('users')
                for (const key in users) {
                    if (Object.prototype.hasOwnProperty.call(users, key)) {
                        const userData = users[key]
                        if (userData.UID === UID) {
                            return userData
                        }
                    }
                }
            }
            const userData: UsersData['users']['username'] = this.get('users.' + username)
            if (userData) {
                return userData
            } else {
                return false
            }
        } catch (error) {
            return false
        }
    }
    /**
     * newUser
     */
    public newUserData(userData: UserData, isAdmin = false) {
        typeof userData.UID !== 'undefined' ? null : (userData.UID = uuidv4())
        typeof userData.alias !== 'undefined' ? null : (userData.alias = userData.username)
        typeof userData.administrator !== 'undefined' ? null : (userData.administrator = isAdmin)
        typeof userData.access !== 'undefined' ? null : (userData.access = { admin: isAdmin })
        return userData
    }
    /**
     * addUser
     */
    public addUser(userData: UserData): this {
        this.set('users.' + userData.username, userData)
        return this
    }
    /**
     * update
     */
    public update(newSettings: Simple): this {
        for (const key in newSettings) {
            if (Object.prototype.hasOwnProperty.call(newSettings, key)) {
                this.store.set(key, newSettings[key])
            }
        }
        return this
    }
    /**
     * list
     */
    public list() {
        this.transformer.s2c(this.data())
        const data = JSON.parse(JSON.stringify(this.transformer.complex)) as Complex
        for (let index = 0; index < data.users.cells.length; index++) {
            const user = data.users.cells[index]
            user.cells = user.cells.filter((v) => v.private !== true)
        }
        return data
    }
    /**
     * add
     */
    public modify(users: UsersData['users']): this {
        for (const username in users) {
            if (Object.prototype.hasOwnProperty.call(users, username)) {
                const user = users[username]
                this.store.set('users.' + username, user)
            }
        }
        return this
    }
    /**
     * verify
     */
    public async verify(username: string, passwordHash: string) {
        if (!username || !passwordHash) {
            return false
        }
        const user = this.getUser({ username })
        if (user === false) {
            return false
        } else {
            const savedPasswordHash = user.password
            return await bcrypt.compare(passwordHash, savedPasswordHash)
        }
    }
    /**
     * firstSignUp
     */
    public firstSignUp
}

export const users = new Users()
