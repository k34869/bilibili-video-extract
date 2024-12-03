#!/usr/bin/env node
const { execSync } = require('child_process')
const { program } = require('commander')
const { error } = require('./lib/stdan')
const { configs } = require('./lib/defineConfig')
const { getCacheList, extractVideo } = require(configs.permission === 'adb' ? './lib/adbMain' : './lib/normalMain')
const package = require('./package.json')

program
    .name(package.binName)
    .version(package.version)
    .description(package.description)
    .option('-i, --input <dirId>', 'input dirId')
    .option('-y, --yes', 'force allow', configs.commandArgs.yes)
    .option('-cl, --clear', 'clear cache', configs.commandArgs.clear)
    .option('--extract-danmu', 'extract danmu', configs.commandArgs['extract-danmu'])
    .option('--download-cover', 'download cover', configs.commandArgs['download-cover'])
    .option('-ft, --filter-title <filterStr>', 'filter title')
    .option('-fu, --filter-uname <filterStr>', 'filter uname')
    .action(opts => {
        try {
            process.stdout.write('WAITING...\n')
            if (opts.input) {
                let ids = opts.input.split(',')
                ids.forEach(e => {
                    let id = e.match(/(^[0-9]{6,}\b|^s_[0-9]{2,}\b)/)
                    console.log(`INFO: '${id[0]}' Extract...`)
                    extractVideo({dirId: id[0], forceAllow: opts.yes, clear: opts.clear, danmu: opts.extractDanmu, cover: opts.downloadCover})
                })
            } else {
                let items = getCacheList(',', '\n', {title: opts.filterTitle, uname: opts.filterUname}).formatStr
                let db = JSON.parse(
                    execSync(`termux-dialog checkbox -v '${items}' -t '请选择(ft: ${opts.filterTitle ?? `无`}, fu: ${opts.filterUname ?? `无`}): '`).toString()
                )
                if (db.text === '[]') 
                    error('select empty')
                else if (db.code === -2)
                    error('select cancel')
                else if (db.code === -1) {
                    db.values.forEach(e => {
                        let id = e.text.match(/(^[0-9]{6,}\b|^s_[0-9]{2,}\b)/)
                        console.log(`INFO: '${id[0]}' Extract...`)
                        extractVideo({dirId: id[0], forceAllow: opts.yes, clear: opts.clear, danmu: opts.extractDanmu, cover: opts.downloadCover})
                    })
                }
            }
        } catch(err) {
            error(err.message)
        }
    })

program
    .command('ls')
    .description('list cache videos')
    .option('-ft, --filter-title <filterStr>', 'filter title')
    .option('-fu, --filter-uname <filterStr>', 'filter uname')
    .action(opts => {
        try {
            const spinner = ora('WAITING...\n').start()
            console.log(`ft: ${opts.filterTitle ?? `无`}, fu: ${opts.filterUname ?? `无`}`)
            console.log(getCacheList('\n\n', '\n', {title: opts.filterTitle, uname: opts.filterUname}).formatStr)
            spinner.stop()
        } catch(err) {
            error(err.message)
        }
    })

program.parse()