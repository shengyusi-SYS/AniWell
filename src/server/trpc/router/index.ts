import { router } from "@s/trpc"
import { assetsRouter } from "./assets"
export const appRouter = router({
    assets: assetsRouter,
})

// You can then access the merged route with
// http://localhost:3000/trpc/<NAMESPACE>.<PROCEDURE>

export type AppRouter = typeof appRouter
