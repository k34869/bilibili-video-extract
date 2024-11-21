const fs = require('fs')
const { execSync } = require('child_process')

function adbConnect(config) {
    if (config.permission === 'adb') {
        const res = execSync(`adb connect 127.0.0.1:${config.port}`).toString()
        if (res.indexOf('failed to connect') !== -1) 
            throw new Error(res)
    }
}

function adbRequire(config, dirId) {
    if (config.permission === 'adb') {
        console.log(`INFO: adb require: '${dirId}'`)
        execSync(`adb shell mv "${config.cachePath}/${dirId}" "${config.stagePath}"`)
        config.cachePath = config.stagePath
    }
}

function adbRestore(config) {
    if (config.permission === 'adb') {
        let dirIds = fs.readdirSync(config.stagePath)
        if (dirIds.length === 0) return
        for (let i = 0; i < dirIds.length; i++) {
            let dirCids = fs.readdirSync(`${config.stagePath}/${dirIds[i]}`)
            for (let j = 0; j < dirCids.length; j++) {
                let entryFile = `${config.stagePath}/${dirIds[i]}/${dirCids[j]}/entry.json`
                console.log(`INFO: adb restore: '${dirIds[i]}'`)
                if (fs.existsSync(entryFile)) {
                    execSync(`adb shell mv "${config.stagePath}/${dirIds[i]}" "${config.cachePath}"`)
                    break
                }
            }
        }
    }
}

module.exports = {
    adbConnect,
    adbRequire,
    adbRestore
}