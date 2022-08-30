# File-server-for-qBittorrent

### 说明

本项目为qbittorrent的周边项目，通过express，对于qbittorrent原生支持的api请求直接进行转发处理

另外提供一套api用于拦截对文件内容的请求，返回本地存储中对应的文件内容

对于视频内容，基于ffmpeg自动生成hls流，可在web端直接播放

（由于ffmpeg和视频本身格式，已知部分如h265 10bit的mkv视频无法转码，

部分mkv需要转码才能正常播放，转码功能之后会支持）



### 使用方法

请先在qbittorrent配置使用了本服务api的webui，

启动本服务前需设置qbittorrent端口(默认localhost:8888)，

启动后，打开qbittorrent webui时，访问本服务端口(默认9000)而不是qbittorrent本身web端口



### API

（todo）