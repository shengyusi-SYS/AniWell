import { TRPCError, initTRPC } from '@trpc/server'
import type { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const middleware = t.middleware

export const publicProcedure = t.procedure
export const adminProcedure = t.procedure.use(
    middleware((opts) => {
        if (!opts.ctx.user) {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        return opts.next(opts)
    }),
)
