const { execSync } = require('child_process')
const { defineConfig } = require('./stdan')
const configs = defineConfig({
    permission: (key, d) => {
        if (d) return d
        else {
            const version = execSync(`getprop ro.build.version.release`).toString()
            return ((version >= 11) ? 'adb' : 'normal')
        }
    },
    cachePath: '${国内版}',
    outputPath: '/storage/emulated/0/bveOutput/${TITLE}/${PAGE_TITLE}',
    commandArgs: {
        'yes': true,
        'clear': false,
        'extract-danmu': true,
        'download-cover': false
    }
})
const CACHE_PATH = configs.cachePath
    .replace(/^\$\{国际版\}$/, '/storage/emulated/0/Android/data/com.bilibili.app.in/download')
    .replace(/^\$\{国内版\}$/, '/storage/emulated/0/Android/data/tv.danmaku.bili/download')
    .replace(/^\$\{HD版\}$/, '/storage/emulated/0/Android/data/tv.danmaku.bilibilihd/download')
    .replace(/^\$\{概念版\}$/, '/storage/emulated/0/Android/data/com.bilibili.app.blue/download')

module.exports = {
    configs,
    CACHE_PATH
}