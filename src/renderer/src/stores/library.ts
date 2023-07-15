import { defineStore } from "pinia"
import { ReqLibrary, reqLibrary } from "@v/api"
import { CardTheme, useGlobalStore } from "./global"
import { useWindowSize } from "@vueuse/core"
import { WritableComputedRef } from "vue"
const globalStore = useGlobalStore()

//用于刮削判断层级(如需要回溯判断)和前端决定展示方法，不可留空
export type resultType =
    | "item" //item表示最基本的刮削结果，如一集视频、一首音乐、一部漫画(很多图片一起)、一本小说(很多分册)，在前端表现为点击后会跳转到相应的处理页面，如视频/音乐播放器、漫画/小说阅读器，即使children中还有item也会忽略，具体处理由前端决定
    | boxLevel
    | "dir" //dir为普通文件夹，与item仅有层级相关性，层级超过box3或等于库根路径时强制为dir
export type boxLevel = //box类与item有刮削结果相关性

        | "box0" //box后的数字表示距离item的层级，如一个包含一季12集视频的文件夹就是box0
        | "box1" //包含三个季也就是3个box0的文件夹就是box1，再往上就是box2，
        | "box2"
        | "box3" //box3为预留

export interface ScraperResult {
    title?: string //前端展示的名称，刮削时产生，默认为不带后缀的文件名或文件夹名
    result?: resultType
    display?: string //result为item时必要，与前端展示功能对应，当前可用:"video"
    poster?: string //海报图绝对路径
    parentTitle?: string //用于判断box类的title
    [key: string]: unknown //预留，用于不同result时的附加刮削信息，具体展示由前端决定
}

export interface MapResult extends ScraperResult {
    title: string
    path: string
    result: resultType
    locked?: boolean //用于防止覆写用户设定
}

export interface libraryData extends MapResult {
    libName: string
    total?: number
    children?: libraryData[]
}

export const useLibraryStore = defineStore("library", () => {
    const libraryData = ref({} as libraryData)

    const enterLibrary = async (params: ReqLibrary) => {
        const newData = await reqLibrary(params)
        libraryData.value = newData
        globalStore.setLibraryTheme(newData.libName)
        if (newData.libName === "overview") {
            newData.children?.map((v) => v.libName).forEach(globalStore.setLibraryTheme) //为不同资源库初始化样式
        }
    }

    const currentTheme = computed(
        () =>
            globalStore.theme.library[
                libraryData?.value.libName === "search" ? "overview" : libraryData?.value.libName
            ],
    )

    const boxTheme: WritableComputedRef<CardTheme> = computed({
        get() {
            if (currentTheme.value) {
                return currentTheme.value[libraryData.value.result] || currentTheme.value.dir
            }
            return {}
        },
        set(val) {
            if (currentTheme.value[libraryData.value.result]) {
                globalStore.theme.library[libraryData.value.libName][libraryData.value.result] = val
            }
        },
    })

    const themeHelper = ref(false)

    const boxInfo = ref(true)

    const searchKeywords = ref("")

    const searchLibrary = (keywords: string = searchKeywords.value) => {
        if (keywords) enterLibrary({ libName: "", search: keywords })
        else enterLibrary({ libName: "" })
    }

    return {
        libraryData,
        enterLibrary,
        currentTheme,
        boxTheme,
        themeHelper,
        boxInfo,
        searchKeywords,
        searchLibrary,
    }
})
