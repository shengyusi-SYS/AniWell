# FileServer-for-qBittorrent v0.3

### 说明

---

本应用为qbittorrent的周边项目，为qbittorrent下载好的视频提供转码串流服务，可在web端直接播放（详见配置项及转码说明），实现下载播放一条龙服务

已完成的配套webui：[qBittorrent Web UI](https://github.com/blytzxdl/qbwebui)（v0.3开始会在本项目的release中集成）

使用jellyfin版的ffmpeg，因其提供了将文本字幕转为图形的方法，可以充分利用显卡硬件加速，并且可以使用libfdk_aac库，提高音频转码速度（主要是自己不会C语言，尝试了三天自己编译ffmpeg仍然报错无穷尽，果断放弃，如不符合协议，烦请提醒）

### 声明

---

本应用当前的定位是为qbittorrent提供轻量级的转码串流服务，目的是简化下载、管理和播放的流程，既不是类似Jellyfin那样的全能媒体服务器，也不是种子播放器。

由于是新人独立开发，能力精力有限，因此，过分的要求不会受理，出现下文未列出且解决方案无效的未知Bug请积极反馈，项目层面的问题烦请大佬提醒。

功能更新的优先级如下：

严重Bug >= 关键功能 > 符合本应用定位的功能 > 实验性功能 >= 常规Bug >= UI改进

### 安装方法

---

[Windows版](https://github.com/blytzxdl/FileServer-for-qBittorrent/tree/main/documents/Windows版安装说明.md)	[Linux版(Ubuntu Desktop)](https://github.com/blytzxdl/FileServer-for-qBittorrent/tree/main/documents/Linux版安装说明.md)	[通用CORE版](https://github.com/blytzxdl/FileServer-for-qBittorrent/tree/main/documents/通用CORE版安装说明.md)

### 配置项

---

应用会自动在根目录生成默认配置文件settings.json，配置项如下（如果不是自动生成的路径，请将反斜杠'\\'换成'/',避免产生错误）

```
{
    
	"qbHost": "http://localhost:8080",	//必填，qBittorrent Web UI的地址，如需使用ssl/https，请设置对应的地址和端口号

	"serverPort": 9009,             	//必填，本应用端口
    
	"tempPath": "./",					//必填，视频缓存路径，默认为系统临时文件目录，可另外指定，指定路径末尾要带/号，会在指定路径生成output文件夹

	"dandanplayPath":""					//弹弹play路径，会尝试在默认安装路径搜索，可关联刮削结果，包括番名、片名及海报图、缩略图

	"ffmpegPath":""						//必填，ffmpeg路径，win下默认为集成的ffmpeg路径，linux下会在jellyfin-ffmpeg默认安装位置下搜索，不建议手动指定为其它版本的ffmpeg

	"cert": "./ssl/domain.pem",     	//ssl证书路径，可手动修改

	"key": "./ssl/domain.key",      	//ssl密钥路径，可手动修改
	
	"secure": false,                 	//ssl安全设置，ssl配置成功后会自动使用true

	"share":false,						//为true时，可将生成的hls地址中"m3u8"后的文本去除，形成固定的串流地址，但这会跳过cookie校验，自己权衡开关与否
	
	"platform": "nvidia",				//服务端显卡型号（详见转码说明）

	"encode": "h264",					//目标编码格式（详见转码说明）

	"bitrate": "5",						//目标视频码率（单位“M”，详见转码说明）
	
	"autoBitrate":false					//自动码率，为true时会将bitrate设置作为参考，在原视频码率的1.5倍低于目标码率时，会使用目标码率，尽量保持原画质；在原视频码率高于目标码率的1.5倍时，会使用目标码率的1.5倍，尽量节省流量和磁盘空间；其它情况下为原视频码率的1.2倍
	
	"advAccel":true						//高级硬件加速，在Windows上基本没问题，Linux上的兼容性待验证；为false时只会使用基础的硬件加速，可能解决大多数兼容问题
					
	"customInputCommand": ""			//自定义ffmpeg输入指令，接收string类型（纯文本）,按空格分隔（详见指令说明）
	
	"customOutputCommand": ""			//自定义ffmpeg输出指令
	
}
```

## 刮削功能

刮削功能基于”弹弹play“实现，与转码播放功能不挂钩，识别准确度由弹弹play决定

**Linux平台因路径等问题暂时无法使用，后续可能会利用弹弹play开放API独立实现**

弹弹play官网：[弹弹play - 全功能“本地视频+弹幕”播放器 (dandanplay.com)](https://www.dandanplay.com/)

刮削后，会在视频文件同目录生成nfo文件，可供TMM、Jellyfin等识别

网页端刮削完成后（即出现海报图后），建议刷新一次网页，避免数据更新机制过多消耗流量

更新模式说明（常规默认为增量合并，初次运行为全量合并）：

- 增量与全量
  - 增量：对自上次更新后，弹弹play数据库中出现的变动进行更新
  - 全量：按弹弹play当前的数据库完整更新
- 合并与覆盖
  - 合并：按弹弹play识别结果对已有nfo文件中的剧名、单集名、顺序等TMM、Jellyfin通常识别不准确的信息进行修改，其它信息保持不变，适合已通过TMM、Jellyfin等进行刮削但对准确度不满意的情况
  - 覆盖：**！！！谨慎使用！！！**按弹弹play识别结果为所有关联视频生成全新的nfo文件（覆盖已存在的nfo），可通过TMM、Jellyfin等进一步完善刮削信息，适合完全初次使用

媒体文件解析设为”基础“即可，本人常用排除项：

```
/\WNC(OP|ED)/
/\WSPs/
/\WCDs/
/\WScans/
/\WMenus/
/\WOAD/
/\WOVA/
/\WPV\d{0,2}/
```

### 安全性

---

支持https，通过qBittorrent的cookie进行校验，仅在share配置为true时对外暴露缓存文件夹tempPath，暂时无法提供更完善的安全保护

### ssl/https配置

---

qbittorrent未使用https时，本应用有无https皆可，qbittorrent开启https时，本应用必须配置https

请使用和qbittorrent相同的证书，在本应用根目录下新建文件夹，命名ssl，放入证书，默认识别"domain.pem"和"domain.key"文件

### 转码说明

---

- **！！！请确认已安装好正确的驱动，尤其是Linux版，详见Linux驱动安装说明**
  
- **！！！Linux版请确认已安装好jellyfin版ffmpeg，详见Linux安装说明**
  
- 编码支持问题
  
  - platform：可选"nvidia","intel","amd","vaapi",选择对应的显卡品牌以使用显卡加速，vaapi仅适用于Linux系统下的intel和amd显卡
  
  - encode：可选"h264","h265"
	
    ！！！h264兼容良好，h265兼容问题复杂，经有限测试，h265视频受平台（如ios对h265支持更好，安卓、pc在网页上大概率不支持h265）、浏览器（如alook可接管视频播放来支持h265，via，chrome等无此功能）等因素限制，如播放器经常出现格式不支持之类的错误，建议选择h264，或者将share设置为true，将生成的hls链接复制到第三方播放器播放
  
- 转码相关问题
  
  - ~~未开启转码的视频，仅进行切片，因此画质、体积基本等同源文件，生成速度极快，主要受源文件和缓存所在的硬盘速度限制，有内存盘的建议将缓存路径设定为内存盘，减少硬盘压力和读写量。~~	当前版本统一强制转码，之后会重新加入不转码的支持
	
	
	- 转码视频
	
	  - 速度：主要受编码器和解码器两方面的硬件能力限制，部分情况下受硬盘速度影响
	
	    有对应显卡及片源、系统环境满足条件时，解码器默认启用高级硬件加速，速度主要受gpu限制
	
	  - 画质：主要由源视频质量和视频码率决定，分辨率遵循源视频，不处理，色深默认为8bit
	
	    画质上限不超过源视频（除非自定义指令来改善），在指定码率低于源视频码率时，画质会出现损失
	
	  - 体积：主要由编码格式和码率决定，相较源视频难以比较（因素复杂）
	
	    大致上相同编码格式，码率越高，体积越大；相同码率，h265视频体积小于h264视频体积
	
	- 硬件加速（当前支持h265、h264编码的源视频。h264 10bit的视频(比如标注有Hi10p)仅支持编码加速，这是硬件限制）
	
	  - 解码加速：
	
	    当前版本的高级硬件加速基于jellyfin版ffmpeg，能尽量发挥显卡性能，但由于使用环境复杂，可能不兼容部分类型的视频，可尝试关闭高级硬件加速advAccel
	
	  - 编码加速：均支持h265、h264
	
- 多显卡问题
  
  - 通常情况下会根据platform选项自动选择对应品牌的第一张显卡
	- Linux系统下使用vaapi时会自动使用系统中的第一张显卡，即/dev/dri/renderD128
	- 也就是说，除非你有多张同品牌的显卡或使用vaapi，基本不需要考虑多显卡切换问题
	- 之后会更新加入选择功能
	
- 网速需求/流量消耗问题

  - 单位说明：

    视频码率的xx M，大致相当于需要网络带宽xx M，例如5M码率的视频，需要至少5M的带宽才能流畅观看，网络带宽小于码率时，需要等待来加载视频，无其它影响；

    带宽换算成常见的网速统计时，按8：1来计算，即1M带宽=125KB/s的网速

    综上，一个5M码率，24分钟的视频，流畅播放需要5M的带宽，平均625KB/s的网速，消耗的流量约为5M×60×24÷8 = 900MB

  - ~~对于未转码视频，视频总体积和消耗的流量大致等于源文件体积~~

  - 对于转码的视频，可通过限制码率来控制需要的网速与消耗的流量（但过低时会严重影响画质）



### 已知问题

---

- ~~amd显卡转码的视频在safari上播放时，可正常连续完整播放，但转码完成后无法跳转进度条（黑屏）（zen2APU核显与a12+ios15测试结果，其它情况自行测试，可尝试用第三方播放器软解播放）~~	启用高级硬件加速后似乎解决了
- ~~多季合集的种子无法准确匹配番名，但其中的单集匹配无误（由弹弹play刮削结果决定）~~已大幅改进，部分细节待优化，过于特殊的情况没办法
- mkv内封多轨非文本字幕时，~~无法直接转码，请在同目录下放入同名外挂字幕（后续可能改进）~~ 会自动使用第一条字幕轨，后续加入字幕选择
- 过于快速地连续跳转进度条会产生多个ffmpeg进程，后续想办法改善，但可能由于编程语言限制无法彻底解决，如要连续跳转，请尽量在继续播放后再进行下次跳转

### 常规问题解决方案

---

- 10%概率的问题：再点一下进度条
- 20%概率的问题：关闭播放器后重新打开
- 30%概率的问题：停止转码并清除缓存后重新播放
- 40%概率的问题：复制串流链接到第三方播放器播放
- 50%概率的问题：重启应用（可能需要在任务管理器结束ffmpeg进程，即占用gpu最多的）
- 60%概率的问题：关闭高级硬件加速advAccel
- 70%概率的问题：按照安装说明重新安装
- 80%概率的问题：检查配置项、qbittorrent等是否正常，硬件配置是否跟得上你的需求
- 90%概率的问题：不要在进度条上跳舞，否则你的电脑会哭
- 100%概率的问题：本应用还不配，你值得更好的

### 使用注意及建议

---

- 每次设置成功配置项后，会在应用根目录下新建settings_backup.json文件来备份，下次更新配置项出现问题时，会读取备份配置，直到正确更新配置项
- 自0.3版本起，已集成了qBittorrent Web UI，如果本应用下的web UI文件不存在或访问qBittorrent本身的Web端口，会使用qBittorrent中设置的web UI（通常是原版的web UI）
- 建议不要过于快速地连续跳转进度条
- 请确认你的电脑配置能满足转码需要，比如我用非虚拟机的ubuntu+i5-1135g7核显测试没问题，但pve虚拟直通的ubuntu+j3455只能播放极少数视频，其它视频可能会在转码一半后报错，或直接导致整个宿主机卡死，jellyfin也差不多（可能是我虚拟机设置问题，比如显存等，还需排查）

### 更新计划（不分先后）

---

- 安全性改进
- 封装qb原api，通过websocket向web传数据
- ~~跨平台支持（linux、openwrt等）~~已部分实现
- 字幕匹配、上传
- ~~虚拟种子（将qB中没有，但弹弹play识别了的文件模拟成种子）~~  暂时通过媒体库页面实现，后续考虑更完善的方案
- 安装向导
- 其它优化
- 。。。

### API

---

（todo）

### ~~ffmpeg指令说明~~	当前版本指令生成系统过于复杂，不建议自定义

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



~~服务器转码前会在控制台输出转码时用的指令，可将其复制后在终端运行，排查错误~~	当前windows版本暂时不显示控制台

