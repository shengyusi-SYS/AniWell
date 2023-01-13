import path from 'path'
import paths from '@s/utils/envPath'
import Store from 'electron-store'
import { TransformConfig, Simple, Complex } from '@s/utils/transformConfig'
import bcrypt from 'bcrypt'
export interface UsersData extends Simple {
    users: {
        [userName: string]: {
            userName?: string
            password: string
            alias: string
            salt: string
            administrator: boolean
            access: {
                [accessName: string]: boolean
            }
        }
    }
}
export type UserData = UsersData['users']['userName']
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
                                name: 'admin',
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
class Users {
    public store: Store<UsersData>
    public transformer: TransformConfig
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
            let newSalt: string
            if (defaultSalt === 'salt') {
                newSalt = bcrypt.genSaltSync(10)
                this.store.set('users.admin.salt', newSalt)
            }
            if (defaultPassword === 'adminUser') {
                const passowrdHash = bcrypt.hashSync(defaultPassword, newSalt)
                const savedPassword = bcrypt.hashSync(passowrdHash, 10)
                this.store.set('users.admin.password', savedPassword)
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
    public getUser(userName: string): UsersData['users']['userName'] {
        return this.get('users.' + userName)
    }
    /**
     * addUser
     */
    public addUser(userName: string, userData: UserData): this {
        this.set('users.' + userName, userData)
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
        for (const userName in users) {
            if (Object.prototype.hasOwnProperty.call(users, userName)) {
                const user = users[userName]
                this.store.set('users.' + userName, user)
            }
        }
        return this
    }
    /**
     * checkAccess
     */
    public checkAccess(userName: string, accessName: string): boolean {
        return this.store.get(`users.${userName}.access.${accessName}`) === true
    }
    /**
     * isAdmin
     */
    public isAdmin(userName: string) {
        return this.checkAccess(userName, 'admin') === true
    }
    /**
     * verify
     */
    public async verify(userName: string, passwordHash: string) {
        if (!userName || !passwordHash) {
            return false
        }
        try {
            const savedPasswordHash = this.getUser(userName).password
            return await bcrypt.compare(passwordHash, savedPasswordHash)
        } catch (error) {
            return false
        }
    }
}

export const users = new Users()
