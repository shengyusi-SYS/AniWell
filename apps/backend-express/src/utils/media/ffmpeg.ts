import paths from '@s/utils/envPath'
import FFmpeg from 'ffmpeg-jellyfin-static'
import { join } from 'path'
export const FFmpegInstaller = new FFmpeg({ cwd: join(paths.resources, 'ffmpeg') })
