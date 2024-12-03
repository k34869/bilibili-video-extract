const { error } = require('./stdan')
const { execSync } = require('child_process')
const { adbPath } = require('adb-android-arm64')
const { ffmpegPath } = require('ffmpeg-android-arm64')
const { isFunction } = require('lodash')

function checkAdbConnectStats(devs) {
    if (devs['127.0.0.1:5555'] !== 'device') 
        error(`'127.0.0.1:5555' device status is ${devs['127.0.0.1:5555']}`)
}

function adbConnect(callback) {
    const res = execSync(`${adbPath} connect 127.0.0.1:5555`).toString().replace(/\n$/g, '')
    if (res.indexOf('failed to connect') !== -1) 
        error(`adb ${res}`)
    getAdbDevicesStat(checkAdbConnectStats)
    if (isFunction(callback)) return callback()
}

function getAdbDevicesStat(callback) {
    let s = execSync(`${adbPath} devices`).toString(), res = {}
    s = Array.from(new Set(s.replace('List of devices attached\n', '').replace(/\n\n/g, '').split('\n')))
    if (s.length === 1)
        if (s[0] === '' || s[0] === '\r\n') 
            return {}
    s.forEach(e => {
        let item = e.split('\t')
        res[item[0]] = item[1]
    })
    callback(res)
}

function adbPushExecFile() {
    try {
        execSync(`${adbPath} -s 127.0.0.1:5555 shell [ ! -f "/data/local/tmp/ffmpeg" ] && ${adbPath} -s 127.0.0.1:5555 push "${ffmpegPath}" "/data/local/tmp/ffmpeg" && ${adbPath} -s 127.0.0.1:5555 shell chmod +x "/data/local/tmp/ffmpeg" || echo 'File already exists'`).toString()    
    } catch (err) {
        error(err.message)
    }
    return {
        ffmpegPath: '/data/local/tmp/ffmpeg'
    }
}

function adbShell(commands) {
    getAdbDevicesStat(checkAdbConnectStats)
    return execSync(`${adbPath} -s 127.0.0.1:5555 shell ${commands}`).toString().replace(/\n$/g, '')
}

module.exports = {
    adbConnect,
    adbPushExecFile,
    adbShell,
    checkAdbConnectStats
}