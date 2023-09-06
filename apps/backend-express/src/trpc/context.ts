import usersStore from '@s/store/users'
import type { UserData } from '@s/store/users'
import { verifyToken } from '@s/utils/jwt'
import auth from '@s/modules/auth'
import type { inferAsyncReturnType } from '@trpc/server'

// created for each request
export const createContext = async (
    { req, res } /* : trpcExpress.CreateExpressContextOptions */,
) => {
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
