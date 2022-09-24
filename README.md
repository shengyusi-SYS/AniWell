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

请先在qbittorrent配置使用了本服务api的webui，安装ffmpeg并配置好环境变量，

启动本应用前需设置qbittorrent Web UI端口(默认连接localhost:8008)，

启动后，打开qbittorrent Web UI时，访问本服务端口(默认9009)而不是qbittorrent本身web端口

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

	"burnSubtitle": true,				//是否烧录字幕，为true且视频同目录下存在同名字幕文件时生效

	"forceTranscode": false,			//是否强制转码，为true时无论字幕是否存在都强制转码，有字幕时自动烧录字幕（即忽略burnSubtitle项）

	"share":false,						//为false时会通过qBittorrent校验cookie，只能通过web UI播放，为true时，可将生成的hls地址粘贴到其它支持流媒体的app中播放(如vlc,mpc等),以提供更好的解码支持（如hevc)，但目前这会跳过cookie校验，请保护好隐私，后续会改进

	"platform": "nvidia",				//服务端显卡型号（详见转码说明）

	"encode": "h264",					//目标编码格式（详见转码说明）

	"bitrate": "5",						//视频码率限制（单位“M”，详见转码说明）

	"customCommand": ""					//自定义ffmpeg指令，接收string类型（纯文本）（详见指令说明）
}
```

### 转码说明

---

- 编码支持问题
  - platform：可选"nvidia","intel","amd","other",选择对应的显卡品牌以使用显卡加速，没有对应显卡则选择"other"通过cpu编码

  - encode：可选"h264","h265"

	  ！！！h264兼容良好，h265兼容问题复杂，经有限测试，h265视频受平台（如ios对h265支持更好，安卓、pc在网页上大概率不支持h265）、浏览器（如alook可接管视频播放来支持h265，via，chrome等无此功能）等因素限制，如播放器经常出现格式不支持之类的错误，建议选择h264，或者将share设置为true，将生成的hls链接复制到第三方播放器播放

- 转码相关问题
  
  - 未开启转码的视频，仅进行切片，因此画质、体积基本等同源文件，生成速度极快，主要受源文件和缓存所在的硬盘速度限制，有内存盘的建议将缓存路径设定为内存盘，减少硬盘压力和读写量
	
	
	- 转码视频
	
	  - 速度：主要受编码器和解码器两方面的硬件能力限制
	
	    解码器默认为cpu解码，经有限测试，与gpu解码速度各有胜负，因此未提供解码器指定，兼容性更好，如果cpu过于孱弱，可通过自定义ffmpeg指令来启用显卡解码（不建议，兼容性差）
	
	    有对应显卡时，编码器默认为gpu编码，速度受gpu限制
	
	  - 画质：主要由源视频质量和视频码率决定，分辨率遵循源视频，不处理
	
	    画质上限不超过源视频（除非自定义指令来改善），在指定码率低于源视频码率时，画质会出现损失
	
	  - 体积：主要由编码格式和码率决定，相较源视频难以比较（因素复杂）
	
	    相同编码格式，码率越高，体积越大；相同码率，h265视频体积小于h264视频体积
	
- 网速需求/流量消耗问题

  - 单位说明：

    视频码率的xx M，大致相当于需要网络带宽xx M，例如5M码率的视频，需要至少5M的带宽才能流畅观看，网络带宽小于码率时，需要等待来加载视频，无其它影响；

    带宽换算成常见的网速统计时，按8：1来计算，即1M带宽=125KB/s的网速

    综上，一个5M码率，24分钟的视频，流畅播放需要5M的带宽，平均625KB/s的网速，消耗的流量约为5M×60×24÷8 = 900MB

  - 对于未转码视频，视频总体积和消耗的流量大致等于源文件体积

  - 对于转码的视频，可通过限制码率来控制需要的网速与消耗的流量（但过低时会严重影响画质）

### ffmpeg指令说明

---

默认指令

```
-ss 0
-i input
-自定义ffmpeg指令生效位置，接收string/纯文本，换行分隔，前后为固定的指令示例，不了解请勿修改
-f hls
-hls_time 10
-hls_segment_type fmp4(h265)/mpegts(h264)
-hls_playlist_type event
-hide_banner
output/index.m3u8
```

服务器转码前会在控制台输出转码时用的指令，可将其复制后在终端运行，排查错误

### ssl/https配置

---

请使用和qbittorrent相同的证书，在本应用根目录下新建文件夹，命名ssl，放入证书，默认识别"domain.pem"和"domain.key"文件

### 更新计划（不分先后）

---

- 安全性改进
- 封装qb原api，通过websocket向web传数据
- 为种子建立本地数据库，提供刮削等功能
- electron封装
- 跨平台支持（linux、openwrt）
- 其它优化
- 。。。

### API

---

（todo）

