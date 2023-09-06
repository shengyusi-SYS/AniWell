import { defineStore } from 'pinia'
import { useWindowSize, useMediaQuery } from '@vueuse/core'
import { useCssVar, type UseCssVarOptions } from '@vueuse/core'
import { type Ref, reactive, ref } from 'vue'
import { type boxLevel, type resultType } from './library'
import { type LibQuery, type TaskProgress, type sortBy } from '@v/api'

export interface LibraryConfig {
    [boxLevel: string]: sortConfig & {}
}

export interface sortConfig {
    sort?: LibQuery['sort']
    sortBy?: LibQuery['sortBy']
    start?: number
    end?: number
}

export interface CardTheme {
    column: number
    columnGutter: number
    rowGutter: number
    pageSize: number
    shadow: string
    shadowHover: string
    fontSize: number
    fontSizeTitle: number
    fontSizeLabel: number
    fontColor: string
    fontColorTitle: string
    fontColorLabel: string
    aspectRatio: number
    textAlign: string
    custom?: {
        backgroundImage?: string
    }
}

export type LibraryTheme = {
    [key in resultType]: CardTheme
}

export interface BaseTheme {
    backgroundColor: string
    backgroundColorL1: string
    backgroundColorD1: string
    fontSize: string
    fontColor: string
    fontColorL1: string
    fontColorD1: string
    [baseThemeName: string]: string | Ref<string>
}

export interface Theme {
    base: BaseTheme
    library: {
        [libName: string]: LibraryTheme
    }
}

export type sortTuple = [sortBy, 'asc' | 'desc']
export const defaultSort: sortTuple[] = [
    ['change', 'desc'],
    ['add', 'desc'],
    ['order', 'asc'],
    ['title', 'asc'],
    ['path', 'asc'],
    ['id', 'asc'],
    ['rank', 'desc'],
    ['like', 'desc'],
    ['air', 'desc'],
    ['creat', 'desc'],
    ['update', 'desc'],
]
const defaultSortRule = {
    sortBy: defaultSort.map((v) => v[0]),
    sort: defaultSort.map((v) => v[1]),
}

//默认资源库配置
const boxes = ['dir', 'box3', 'box2', 'box1', 'box0']
export const defaultLibraryConfig: LibraryConfig = {}
for (let index = 0; index < boxes.length; index++) {
    const level = boxes[index]
    defaultLibraryConfig[level] = {
        sort: defaultSortRule.sort,
        sortBy: defaultSortRule.sortBy,
        start: 0,
        end: 20,
    }
}

export const useGlobalStore = defineStore('global', () => {
    const savedGlobal = () => {
        const savedGlobal = localStorage.getItem('global') || false
        const global = savedGlobal ? JSON.parse(savedGlobal) : false
        return global
    }

    const clientState = reactive({
        minWidthCheck: useMediaQuery('(min-width: 426px)'),
        minHeightCheck: useMediaQuery('(min-height: 426px)'),
        isPreferredDark: useMediaQuery('(prefers-color-scheme: dark)'),
    })

    const isDesktop = computed(() => clientState.minHeightCheck && clientState.minWidthCheck)

    //根据桌面/移动端修改默认值
    const selectByEnv = <T>(a: T, b: T) => (isDesktop.value ? a : b)

    const defaultLibraryTheme: LibraryTheme = {
        dir: {
            column: selectByEnv(5, 1),
            columnGutter: 2,
            rowGutter: selectByEnv(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: selectByEnv(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box0: {
            column: selectByEnv(5, 1),
            columnGutter: 2,
            rowGutter: selectByEnv(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: selectByEnv(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box1: {
            column: selectByEnv(5, 1),
            columnGutter: 2,
            rowGutter: selectByEnv(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: selectByEnv(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box2: {
            column: selectByEnv(5, 1),
            columnGutter: 2,
            rowGutter: selectByEnv(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: selectByEnv(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        box3: {
            column: selectByEnv(5, 1),
            columnGutter: 2,
            rowGutter: selectByEnv(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: selectByEnv(1, 0.8),
            fontSizeTitle: 1.5,
            fontSizeLabel: 1,
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 3 / 4,
            textAlign: 'center',
        },
        item: {
            column: selectByEnv(5, 2),
            columnGutter: 2,
            rowGutter: selectByEnv(4, 8),
            pageSize: 20,
            shadow: '0 0 35px 5px rgb(0 0 0 / 40%)',
            shadowHover: '0 0 35px 5px rgb(0 0 0 / 60%)',
            fontSize: selectByEnv(1, 0.8),
            fontSizeTitle: selectByEnv(1.2, 1.5),
            fontSizeLabel: selectByEnv(0.8, 1),
            fontColor: '#999',
            fontColorTitle: '#fff',
            fontColorLabel: '#999',
            aspectRatio: 16 / 9,
            textAlign: 'center',
        },
    }

    const theme: Ref<Theme> = ref({
        base: {
            backgroundColor: '#2a2a2a',
            backgroundColorL1: '#3a3a3a',
            backgroundColorD1: '#1a1a1a',
            fontSize: '1.6rem',
            fontColor: '#999',
            fontColorL1: '#fff',
            fontColorD1: '#666',
        },
        library: {},
    })

    //覆盖el plus默认样式
    const baseThemeMap: { [varName: string]: string } = {
        '--el-bg-color': 'backgroundColor',
        '--el-bg-color-overlay': 'backgroundColorD1',
        '--el-bg-color-page': 'backgroundColorL1',
    }

    const initTheme = () => {
        const global = savedGlobal()
        if (typeof global === 'object' && global.theme) {
            const userTheme = global.theme as Theme
            if (userTheme) theme.value = userTheme
        } else return
    }

    const setLibraryTheme = (libName: any) => {
        if (libName && !theme.value.library[libName]) {
            theme.value.library[libName] = defaultLibraryTheme
            return
        }
    }

    interface libraryConfigs {
        [libName: string]: LibraryConfig
    }
    const libraryConfig: Ref<libraryConfigs> = (() => {
        const global = savedGlobal()
        if (typeof global === 'object' && global.libraryConfig instanceof Object) {
            const savedLibraryConfig = global.libraryConfig as libraryConfigs
            return ref(savedLibraryConfig)
        } else return ref({})
    })()

    return {
        theme,
        initTheme,
        clientState,
        isDesktop,
        libraryConfig,
        setLibraryTheme,
        baseThemeMap,
    }
})

//全局缓存
export const globalCache = {
    loggedIn: false,
    electronEnv: Boolean(window.electronAPI),
    serverLog: reactive({
        list: [] as Array<string>,
        info(log: string) {
            if (this.list.length > 100) {
                this.list.pop()
            }
            this.list.unshift(log)
        },
    }),
    serverMessage: reactive({
        list: [] as Array<string>,
        add(message: string) {
            if (this.list.length > 100) {
                this.list.pop()
            }
            this.list.unshift(message)
        },
    }),
    serverTaskProgress: {
        list: ref([
            // {
            //     state: 'rejected',
            //     name: 'test',
            //     uuid: 'uuu',
            //     total: 100,
            //     stageName: 'ssss',
            //     stageId: 1,
            //     stageTotal: 500,
            //     currentName: 'cccc',
            //     currentId: 2,
            // },
        ]) as Ref<Array<TaskProgress>>,
        add(progress: TaskProgress) {
            const existIndex = this.list.value.findIndex((v) => v.uuid === progress.uuid)
            if (existIndex >= 0) {
                this.list.value[existIndex] = progress
                return
            }
            if (this.list.value.length > 100) {
                this.list.value.pop()
            }
            this.list.value.unshift(progress)
        },
    },
    serverDelay: reactive({
        list: [] as Array<string | number>,
        add(delay: number) {
            if (this.list.length > 100) {
                this.list.pop()
            }
            this.list.unshift(delay)
        },
    }),
    appElement: ref(),
    alertMessages: ref(''),
}

//非响应式全局数据
const globalData = {
    first: false,
    salt: '',
    username: '',
}

let inited = false
export const proxyGlobalData = new Proxy(globalData, {
    get(target, key) {
        if (inited) return Reflect.get(target, key)

        try {
            const local: object = JSON.parse(localStorage.getItem('globalData') as string)
            for (const [key, value] of Object.entries(local)) {
                Reflect.set(target, key, value)
            }
            inited = true
            return Reflect.get(local, key)
        } catch (error) {
            localStorage.setItem('globalData', JSON.stringify(target))
            return Reflect.get(target, key)
        }
    },
    set(target, key, value) {
        switch (key) {
            case 'first':
                if (typeof value !== 'boolean') {
                    throw new Error('TypeError:need boolean')
                }
                break
            case 'salt':
                if (typeof value !== 'string') {
                    throw new Error('TypeError:need string')
                }
                break
            case 'username':
                if (typeof value !== 'string') {
                    throw new Error('TypeError:need string')
                }
                break
        }
        const res = Reflect.set(target, key, value)
        if (res) localStorage.setItem('globalData', JSON.stringify(target))
        return res
    },
})
