# File-server-for-qBittorrent

### 说明

---

本项目为qbittorrent的周边项目，通过express，对于qbittorrent原生支持的api请求直接进行转发处理

另外提供一套api用于拦截对文件内容的请求，返回本地存储中对应的文件内容

对于视频内容，基于ffmpeg自动生成hls流，可在web端直接播放（详见配置项及转码说明）

其它类型后续将提供下载或预览功能

已完成的配套webui：[qBittorrent Web UI](https://github.com/blytzxdl/qbwebui)

### 使用方法

---

1. 安装ffmpeg，配置好环境变量（后续加入手动指定路径）
2. qbittorrent配置好webUI（建议先了解使用方法[qBittorrent Web UI](https://github.com/blytzxdl/qbwebui)）
3. 将qbittorrent的web端口设为8008（或修改本应用根目录下的配置文件settings.json中的qbHost为当前qbittorrent的webUI地址，详见下方配置项）
4. 可选，修改配置文件settings.json
5. 运行本应用（win下为FileServer-for-qBittorrent.exe）
6. 通过serverPort端口（默认地址http://localhost:9009）访问本应用，enjoy it！

### 配置项

---

应用会自动在根目录生成默认配置文件settings.json，配置项如下

```
{
    
	"qbHost": "http://localhost:8008",	//qBittorrent Web UI的地址，如需使用ssl/https，请设置对应的地址和端口号

	"serverPort": 9009,             	//本应用端口
    
	"tempPath": "./",					//视频缓存地址，默认在应用根目录生成output文件夹，可另外指定，指定路径末尾要带/号，会在指定路径生成output文件夹

	"cert": "./ssl/domain.pem",     	//ssl证书路径，可手动修改

	"key": "./ssl/domain.key",      	//ssl密钥路径，可手动修改
	
	"secure": false,                 	//ssl安全设置，ssl配置成功后会自动使用true

	"share":false,						//为false时会通过qBittorrent校验cookie，只能通过web UI播放，为true时，可将生成的hls地址粘贴到其它支持流媒体的app中播放(如vlc,mpc等),以提供更好的解码支持（如hevc)，但目前这会跳过cookie校验，请保护好隐私，后续会改进

	"platform": "nvidia",				//服务端显卡型号（详见转码说明）

	"encode": "h264",					//目标编码格式（详见转码说明）

	"bitrate": "5",						//视频码率限制（单位“M”，详见转码说明）
					
	"customInputCommand": ""			//自定义ffmpeg输入指令，接收string类型（纯文本）,按换行分隔（详见指令说明）
	
	"customOutputCommand": ""			//自定义ffmpeg输出指令
}
```

### 安全性

---

通过qBittorrent的cookie进行校验，仅在share配置为true时对外暴露缓存文件夹tempPath，暂时无法提供更完善的安全保护

### ssl/https配置

---

qbittorrent未使用https时，本应用有无https皆可，qbittorrent开启https时，本应用必须配置https

请使用和qbittorrent相同的证书，在本应用根目录下新建文件夹，命名ssl，放入证书，默认识别"domain.pem"和"domain.key"文件

### 转码说明

---

- 编码支持问题
  - platform：可选"nvidia","intel","amd","other",选择对应的显卡品牌以使用显卡加速，没有对应显卡则选择"other"通过cpu编码

  - encode：可选"h264","h265"

	  ！！！h264兼容良好，h265兼容问题复杂，经有限测试，h265视频受平台（如ios对h265支持更好，安卓、pc在网页上大概率不支持h265）、浏览器（如alook可接管视频播放来支持h265，via，chrome等无此功能）等因素限制，如播放器经常出现格式不支持之类的错误，建议选择h264，或者将share设置为true，将生成的hls链接复制到第三方播放器播放

- 转码相关问题
  
  - ~~未开启转码的视频，仅进行切片，因此画质、体积基本等同源文件，生成速度极快，主要受源文件和缓存所在的硬盘速度限制，有内存盘的建议将缓存路径设定为内存盘，减少硬盘压力和读写量。~~	当前版本统一强制转码，之后会重新加入不转码的支持
	
	
	- 转码视频
	
	  - 速度：主要受编码器和解码器两方面的硬件能力限制
	
	    ~~解码器默认为cpu解码，经有限测试，与gpu解码速度各有胜负，因此未提供解码器指定，兼容性更好，如果cpu过于孱弱，可通过自定义ffmpeg指令来启用显卡解码（不建议，兼容性差）~~
	
	    有对应显卡及系统环境满足条件时，编码器默认启用硬件加速，速度主要受gpu限制
	
	  - 画质：主要由源视频质量和视频码率决定，分辨率遵循源视频，不处理
	
	    画质上限不超过源视频（除非自定义指令来改善），在指定码率低于源视频码率时，画质会出现损失
	
	  - 体积：主要由编码格式和码率决定，相较源视频难以比较（因素复杂）
	
	    相同编码格式，码率越高，体积越大；相同码率，h265视频体积小于h264视频体积
	
- 网速需求/流量消耗问题

  - 单位说明：

    视频码率的xx M，大致相当于需要网络带宽xx M，例如5M码率的视频，需要至少5M的带宽才能流畅观看，网络带宽小于码率时，需要等待来加载视频，无其它影响；

    带宽换算成常见的网速统计时，按8：1来计算，即1M带宽=125KB/s的网速

    综上，一个5M码率，24分钟的视频，流畅播放需要5M的带宽，平均625KB/s的网速，消耗的流量约为5M×60×24÷8 = 900MB

  - ~~对于未转码视频，视频总体积和消耗的流量大致等于源文件体积~~

  - 对于转码的视频，可通过限制码率来控制需要的网速与消耗的流量（但过低时会严重影响画质）

### ffmpeg指令说明

---

默认指令

```
-copyts
-ss ...
(-c:v ...)
-i "..." 
-c:v ...
(-tag:v hvc1) 
(-pix_fmt yuv420p)
(-sn) 
(-vf subtitles=in.ass )
-c:a aac 
-ac 2  
-ab 384000 
-avoid_negative_ts disabled 
-g ...
-keyint_min:v:0 ...
-b:v ...
-bufsize ...
-maxrate ...
-f hls
-hls_time 3
-hls_segment_type mpegts
-hls_flags temp_file
-start_number ...
-hls_segment_filename "..."
-hls_playlist_type event
-hls_list_size 0
-hide_banner
-y
...
```

(...和()表示按条件动态生成)

自定义指令

```js
-copyts
-ss ...
-customInputCommand(输入指令生效位置)
-i "..." 
-customOutputCommand（输出指令生效位置）
-avoid_negative_ts disabled 
-g ...
-keyint_min:v:0 ...
-f hls
-hls_time 3
-hls_segment_type mpegts
-hls_flags temp_file
-start_number ...
-hls_segment_filename "..."
-hls_playlist_type event
-hls_list_size 0
-hide_banner
-y
...
```



服务器转码前会在控制台输出转码时用的指令，可将其复制后在终端运行，排查错误



### 更新计划（不分先后）

---

- 安全性改进
- 封装qb原api，通过websocket向web传数据
- 为种子建立本地数据库，提供刮削等功能
- 跨平台支持（linux、openwrt）
- 其它优化
- 。。。

### API

---

（todo）

