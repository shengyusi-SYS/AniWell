import { TRPCError, inferAsyncReturnType, initTRPC } from "@trpc/server"
import * as trpcExpress from "@trpc/server/adapters/express"
import usersStore from "@s/store/users"
import type { UserData } from "@s/store/users"
import { verifyToken } from "@s/utils/jwt"
import auth from "@s/modules/auth"

// created for each request
export const createContext = async ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
    const user = await new Promise<UserData | undefined>((resolve, reject) => {
        const { refreshToken, accessToken } = req.cookies
        let refreshTokenInfo = verifyToken(refreshToken)
        // const accessTokenInfo = verifyToken(accessToken)
        if (refreshTokenInfo) {
            const user = usersStore.getUser({ UID: refreshTokenInfo.UID })
            if (user && auth.isAdmin({ UID: user.UID }) === true) return resolve(user)
        }
        resolve(undefined)
    })

    return { user }
}

export type Context = inferAsyncReturnType<typeof createContext>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const middleware = t.middleware
export const publicProcedure = t.procedure
export const adminProcedure = t.procedure.use(
    middleware((opts) => {
        if (!opts.ctx.user) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }
        return opts.next(opts)
    }),
)
