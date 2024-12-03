const fs = require('fs')
const { homedir } = require('os')
const { resolve } = require('path')
const { execSync } = require('child_process')
const { isArray, isFunction, isObject } = require('lodash')
const { name } = require('../package.json')

function error(msg, code) {
    console.error('\033[31merror\033[0m: ' + msg);
    if (code === undefined) eval(code);
    process.exit(1);
}

function defineConfig(configs = []) {
    try {
        let configData = {}
        const res = {}
        const userConfigDir = resolve(homedir(), `./.config/${name}`)
        const userConfigPath = `${userConfigDir}/config.json`
        const isConfigPath = fs.existsSync(userConfigPath)
        if (isConfigPath)
            configData = require(userConfigPath)
        if (isArray(configs)) 
            for (const e of configs) {
                res[e] = configData[e]
            }
        else if (isObject(configs)) {
            for (const key in configs) {
                if (configData[key]) 
                    res[key] = configData[key]
                else if (isFunction(configs[key])) 
                    res[key] = configs[key](key, configData[key])
                else if (isObject(configs[key])) {
                    res[key] = {}
                    for (const keyChild in configs[key]) {
                        const childData = isObject(configData[key]) ? configData[key][keyChild] : undefined
                        if (childData) 
                            res[key][keyChild] = childData
                        else if (isFunction(configs[key][keyChild])) 
                            res[key][keyChild] = configs[key][keyChild]({key, keyChild}, childData)
                        else 
                            res[key][keyChild] = configs[key][keyChild]
                    }
                } else
                    res[key] = configs[key]
            }
        } else 
            throw new Error(`The type of 'configs' can only be an 'Array' or an 'Object'`)
        if (!isConfigPath) {
            execSync(`mkdir -p "${userConfigDir}"`)
            fs.writeFileSync(userConfigPath, JSON.stringify(res, null, 4), 'utf8')
        }
        return res
    } catch (err) {
        error(err.message)
    }
}

module.exports = {
    defineConfig,
    error
}