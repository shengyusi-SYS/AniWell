import { router, publicProcedure, adminProcedure } from "@s/trpc"
import { readFile, stat } from "fs/promises"
import { Base64 } from "js-base64"
import { z } from "zod"
import { fileTypeFromFile } from "file-type"
export const assetsRouter = router({
    getPoster: adminProcedure
        .input(
            z.object({
                type: z.enum(["poster", "font"]),
                path: z.string(),
                latest: z.string().datetime().optional(),
            }),
        )
        .query(async ({ input, ctx }) => {
            try {
                const latest = (await stat(input.path)).mtime.toISOString()
                if (input.latest === latest) return

                const type = await fileTypeFromFile(input.path)
                if (type && type.mime.split("/")[0] !== "image") return

                const buffer = await readFile(input.path)
                const data = Base64.fromUint8Array(buffer)
                return {
                    latest,
                    data,
                }
            } catch (error) {
                console.log(error)
                return
            }
        }),
})
