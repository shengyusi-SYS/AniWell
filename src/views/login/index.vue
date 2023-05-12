<script setup lang="ts">
import { reqLogin, reqIsFirst, reqAutoLogin } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { proxyGlobalData } from '@v/stores/global'
const router = useRouter()

const loginUser = ref({ username: '', password: '' })
const login = async () => {
    const res = await reqLogin(...Object.values(loginUser.value))
    // console.log('login', proxyGlobalData.first, res)

    if (res) {
        try {
            const first = await reqIsFirst()
            console.log('first', first)

            if (first) {
                router.push('/welcome')
            } else {
                router.push({ name: 'home' })
            }
        } catch (error) {
            console.log(error)
        }
    }
}

reqAutoLogin() //尝试自动登录
    .then((result) => {
        if (result) router.push({ name: 'home' })
    })
    .catch((err) => {})

// useListenLifecycle('login')
</script>

<script lang="ts">
export default {
    name: 'Login',
}
</script>

<template>
    <div class="login-base col">
        <div style="font-size: 2em">Login</div>
        <div class="col">
            <ElInput
                v-model="loginUser.username"
                class="login-input"
                size="large"
                placeholder="用户名"
                autofocus
                :formatter="(value:string) => value.replace(/\W/,'')"
            />
            <ElInput
                v-model="loginUser.password"
                class="login-input"
                size="large"
                placeholder="密码"
                show-password
                :formatter="(value:string) => value.replace(/\W/,'')"
            />
        </div>
        <div>
            <ElButton size="large" @click="login">登录</ElButton>
        </div>
    </div>
</template>

<style lang="less" scoped>
.login-base {
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
    .login-input {
        width: 20em;
        height: 3em;
        margin: 0.5em;
    }
}
</style>
