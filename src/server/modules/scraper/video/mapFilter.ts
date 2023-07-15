import { dotGet } from "@s/utils"
import { AppendedMetadata } from "./filterAndAppend"
import { ScraperResult, FileMetadata, DirMetadata } from "@s/store/library"

export default function filter(
    metaData: FileMetadata | DirMetadata,
    mapRules: string | string[], //规则数组，非贪婪
) {
    if (typeof mapRules === "string") {
        const mapValue = dotGet(metaData, mapRules)
        if (mapValue != undefined) {
            return mapValue
        }
    } else if (mapRules instanceof Array) {
        for (let index = 0; index < mapRules.length; index++) {
            const rule = mapRules[index]
            const mapValue = dotGet(metaData, rule)
            if (mapValue != undefined) {
                return mapValue
            }
        }
    }
}
