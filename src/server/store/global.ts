import Store from "electron-store"
import paths from "@s/utils/envPath"
import debounce from "lodash/debounce"
const store = new Store({
    name: "global",
    cwd: paths.data,
    defaults: {},
})

export function shallowProxy(obj, cb) {
    if (typeof obj === "object") {
        return new Proxy(obj, {
            set(target, key, value, receiver) {
                // const storeKey = (base ? base + '.' : base) + key
                // if (typeof value === 'object') {
                //     value = deepProxy(value, cb)
                // }
                cb(target[key] == undefined ? "create" : "modify", {
                    target,
                    key,
                    value,
                })
                return Reflect.set(target, key, value, receiver)
            },
            get(target, key, receiver) {
                return Reflect.get(target, key, receiver)
            },
            deleteProperty(target, key) {
                cb("delete", { target, key })
                return Reflect.deleteProperty(target, key)
            },
        })
    } else return obj
}

export function deepProxy(obj, cb) {
    if (typeof obj === "object") {
        // for (const key in obj) {
        //     if (typeof obj[key] === 'object') {
        //         obj[key] = deepProxy(obj[key], cb)
        //     }
        // }
        return new Proxy(obj, {
            set(target, key, value, receiver) {
                // const storeKey = (base ? base + '.' : base) + key
                if (typeof value === "object") {
                    value = deepProxy(value, cb)
                }
                //排除数组修改length回调
                if (!(Array.isArray(target) && key === "length")) {
                }

                debounce(() => {
                    return process.nextTick(() =>
                        cb(target[key] == undefined ? "create" : "modify", {
                            target,
                            key,
                            value,
                        }),
                    )
                }, 3000)
                return Reflect.set(target, key, value, receiver)
            },
            get(target, key, receiver) {
                return Reflect.get(target, key, receiver)
            },
            deleteProperty(target, key) {
                cb("delete", { target, key })
                return Reflect.deleteProperty(target, key)
            },
        })
    } else return obj
}

const globalStore = deepProxy(store.store, (a, b) => {
    // store.set(globalStore)
})
export default globalStore
