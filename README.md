# FileServer-for-qBittorrent v0.5.0

## 说明

​ 此后本项目为 Typescript+Vite+Vue3+Nodejs+Express+Electron+Prettier 编写的全栈项目，定位为资源管理服务器，能综合管理用户所存储的各类资源，如视频、音乐等，并能通过客户端直接播放/阅览/...，但当前开发首先以流媒体服务器为标准，完成具有拓展性、复用性的基础架构。旧功能等待逐步迁移，新功能预计将通过插件形式实现。

开发说明

-   后端部分

    -   概述：类似 Jellyfin 的**流媒体服务器**，基于 Nodejs+Express 实现，Electron 提供独立用户界面、托盘图标等功能，Vite+Electron-builder 完成打包
    -   技术栈：env-paths + electron-store + log4js + bcryptjs + selfsigned + jsonwebtoken + child_process + ffmpeg + ...
    -   基础共用模块：
        -   存储系统：主要使用 env-paths + electron-store，在**规范的位置**存储 json 数据，部分数据通过**Proxy**简化读写及存储
        -   日志系统：使用 log4js 在本地存储日志文件，动态切换日志等级。（待完成：通过 Websocket 同步到客户端）
    -   路由及 API 模块：
        -   使用 express router 配置**多级路由**，实现**RESTful API**，
        -   部分数据通过 compression 中间件**进行 gzip 压缩**或**cache-control**设置**缓存**，减少流量开销，
        -   通过 connect-history-api-fallback 中间件，配合 web 端的 HTML5 历史模式
        -   约定：成功且无响应数据时，仅设置 res.code(200).end()，错误且需要提醒时，返回{message:'提醒消息',alert:true}（待完成）
    -   安全模块：
        -   ssl 加密：用户未配置 ssl 证书时，使用 selfsigned 生成**自签名证书**，同时用于**https 及 jwt 签名**，保障信息安全
        -   用户：登录注册时接收到的密码实为用户密码的 hash 值，本地保存的用户密码为通过 bcryptjs 再次进行加密的 hash 值，**避免明文传输或存储**原始密码
        -   鉴权：
            -   在用户登录验证成功时，通过 jsonwebtoken 生成**RSA 签名**的 token
            -   在响应头中设置**httpOnly**和**secure**的**cookie**来存储 token，**防范 xss 攻击**，并免去前端发送请求时主动设置 cookie，更加方便
            -   接收 api 请求时，在 api 路由**入口进行鉴权**，获取请求中的 token 并通过 jsonwebtoken 校验
            -   维护一个废弃 token 存储库，在 jwt 校验环节加入**废弃 token 校验**，防止 jwt 的无状态特性引发安全问题
    -   视频服务模块：贯彻**面向对象**思想，主要使用 nodejs 的**child_process**调用**ffmpeg**进行视频处理
        -   顶层为任务队列控制器，请求视频链接时，根据请求参数及视频文件信息生成合适类型的任务，并返回带有 uuid 的链接等信息；请求视频内容时根据链接中的 uuid 找到对应的任务，将请求交给任务中的控制器处理
        -   字幕信息和任务关联，根据 uuid 信息获取其本地路径，不满足条件的字幕将经过 ffmpeg 处理，最后并返回
        -   字体由于无隐私，与视频关联弱，会统一复制或用 7z 解压到特定路径，由 express.static 提供服务，并通过**cache-control**设置**强缓存**
        -   直接串流类型：根据请求头中的 range 信息创建视频片段的可读流，通过**pipe**压入响应流，并在响应头中设置相关 range 信息
        -   转码串流类型：（待迁移）
            -   通过 ffmpeg 获取视频信息，按照**hls 协议**的规定生成串流的索引文件，再给客户端返回串流地址
            -   通过自写的**ffmpeg 指令生成**工具，根据视频信息、硬件环境、客户端请求，生成可启用硬件加速的具体的 ffmpeg 指令模板
            -   通过 child_process 调用 ffmpeg，由**stdout**生成串流文件，根据**stderr**的日志信息监听工作进度
            -   根据客户端的串流片段请求和服务端的串流进度情况来应对用户的**视频跳转行为**，并进行防抖处理，防止子进程管理出错
    -   媒体库模块：（待迁移）
    -   其它问题：
        -   electron 会将页面中的相对路径转化为 file 协议+绝对路径来读取本地文件，所以为 electron 设置了协议拦截，通过 interceptHttpProtocol 将 file 协议的请求转化为 http 请求，避免相对路径出错，方便后续开发

-   前端部分
    -   技术栈：Vue Router + Pinia + Element Plus + Vant + Less + Axios + VueUse + bcrypt + 响应式布局 + 自动导入 + ...
    -   API 模块：
        -   使用 Axios 封装请求，通过响应拦截器将约定格式的返回结果进行简化，方便使用
        -   约定：code200 且无数据时，返回 true，有数据时，返回数据。错误且无 alert 时，返回 false，alert 为 true 时，通过 toast 提醒（待完成）
    -   存储模块：
        -   主要使用**Pinia**管理，部分用户数据如自定义样式等，通过$subscribe api 实现**持久化存储**
        -   部分不方便用 pinia 管理的非响应式数据，使用**Proxy+LocalStorage**来管理
        -   部分中小型文件由服务端设置缓存，由浏览器直接管理，如海报图使用**协商缓存**，字体使用**强缓存**
        -   使用 indexDB 实现大型数据的缓存（待完成）
    -   路由模块：
        -   对于登录及初始化等涉及**安全**问题的页面，使用 beforeEnter 严格控制进入条件
        -   对于其它页面，通过在 beforeEach 中校验登录状态来控制，服务端数据的获取一律需要 cookie 中的 token 进行校验，因此即使伪造登录状态也无实际安全问题
        -   使用**HTML5 历史模式**，配合服务端的 history 路由回退中间件，能对前进后退、返回手势等操作做出更符合直觉的响应
    -   登录模块：根据不同的用户输入及状态来处理登录，
        -   常规流程为：根据用户名请求对应的**salt** -> 通过**bcryptjs**+salt 为密码生成**hash** -> 将用户名及密码的 hash 值发送给后端校验 -> 获取到**httponly**的**jwt token** -> 设置会话登录状态，完成登录
        -   为了安全和方便，salt 值放进本地存储，**减少请求**salt 的次数，并且尝试检查是否已有 token，已有 token 时则尝试仅通过 token 请求登录，以实现**自动登录**并且**减少**用户名及密码 hash 的**发送**次数
    -   主题样式：
        -   基于 Element Plus 主题，通过 VueUse/useCssVar 进行覆盖修改，并持久化存储，支持**动态修改**及**用户自定义**
        -   通过**媒体查询**，以 426px 为边界(区分常规手机与平板)设置移动端与桌面端的**响应式**，方便后续设计
    -   媒体库页面及卡片组件：
        -   布局：媒体库页面接收树形数据，使用宫格布局展示卡片组件，卡片组件使用**懒加载**，根据媒体库页面宽度、卡片列数及卡片纵横比**动态调整**字体大小和布局
        -   导航：通过分页器或具有特定标签的卡片进行路由跳转，通过跳转时附带的**路由信息**请求新数据，实现页面更新或打开特定功能页面
    -   视频播放器组件：使用 dplayer+hls.js+libass-wasm(subtitles-octopus)，根据服务端返回的视频数据自动生成合适的配置项，对 libass-wasm 的**WebWorker**部分做修改以完成适配及实现特定功能
