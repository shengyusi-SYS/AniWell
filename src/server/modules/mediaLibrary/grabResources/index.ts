import { access, writeFile } from "fs/promises"
import path from "path"
import { scrapeLogger } from "@s/utils/logger"
import got from "got"
async function grabResources(dirPath, imageUrl) {
    // console.log(imageUrl);
    let existPoster = false
    const overwrite = false
    if (!overwrite) {
        try {
            await access(path.resolve(dirPath, `folder.jpg`))
            existPoster = true
            return path.resolve(dirPath, `folder.jpg`)
        } catch (error) {
            try {
                await access(path.resolve(dirPath, `poster.jpg`))
                existPoster = true
                return path.resolve(dirPath, `poster.jpg`)
            } catch (error) {
                scrapeLogger.error("grabResources read", error)
            }
        }
    }
    if (overwrite || !existPoster) {
        try {
            const task = await got({
                url: imageUrl,
                method: "get",
                responseType: "buffer",
                headers: {
                    "User-Agent": `fileServer for qbittorrent 0.4`,
                },
            })
            const res = task.body
            await writeFile(path.resolve(dirPath, `folder.jpg`), res)
            scrapeLogger.debug("grabResources", dirPath)
            return path.resolve(dirPath, `folder.jpg`)
        } catch (error) {
            scrapeLogger.error("grabResources", error)
        }
    }
    return false
}

export default grabResources
