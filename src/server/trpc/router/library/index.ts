import { router, publicProcedure } from "@s/trpc"
import { readFile, stat } from "fs/promises"
import { Base64 } from "js-base64"
import { z } from "zod"
import { fileTypeFromFile } from "file-type"
export const libraryRouter = router({})
