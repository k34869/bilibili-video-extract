#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const readline = require('readline-sync')
const { execSync } = require('child_process')
const { program } = require('commander')
const { error } = require('./lib/stdan.js')
const { adbConnect, adbRequire, adbRestore } = require('./lib/adb.js')
const package = require('./package.json')
const config = require('./config.json')
const CACHE_PATH = config.cachePath
if ((typeof config.cachePath !== 'string') || (typeof config.output !== 'string')) 
    error(`Please check that the 'cachePath' and 'output' are configured correctly`)

function getDirSize(dirPath, mode) {
    let size
    if (mode === 'adb') 
        size = execSync(`adb shell du -h -d 0 "${dirPath}" | awk '{print $1}'`).toString().replace(/\n$/g, '')
    else 
        size = execSync(`du -h -d 0 "${dirPath}" | awk '{print $1}'`).toString().replace(/\n$/g, '')
    return size
}

function entryProcess(dirId, entry, mode) {
    let title = entry.title.replace(/[\/]/g, '|')
    let size = getDirSize(`${config.cachePath}/${dirId}`, mode)
    if (dirId.search(/^s_/) === -1) {
        let pagePartStat = (entry.page_data.part === undefined) || (entry.page_data.part === entry.title)
        let { owner_name, avid, bvid, type_tag, quality_pithy_description, page_data: { cid, page } } = entry
        return {
            title,
            avid,
            bvid,
            cid,
            page,
            pagePartStat,
            size,
            dirId,
            pagePartStat,
            typeTag: type_tag,
            ownerName: owner_name,
            qualityPithyDescription: quality_pithy_description,
            pageTitle: pagePartStat ? '' : entry.page_data.part.replace(/[\/]/g, '|')
        }
    } else {
        let { type_tag, source: { av_id: avid, cid, quality_pithy_description, website: owner_name }, ep: { page, bvid } } = entry
        return {
            title,
            avid,
            bvid,
            cid,
            page,
            size,
            dirId,
            typeTag: type_tag,
            pagePartStat: false,
            ownerName: owner_name,
            qualityPithyDescription: quality_pithy_description,
            pageTitle: entry.ep.index_title === '' ? entry.ep.index : entry.ep.index_title
        }
    }
}

function getEntryData(dirId, firstBreak, mode) {
    let datas = new Array, dirCids
    if (mode === 'adb') 
        dirCids = execSync(`adb shell ls "${config.cachePath}/${dirId}"`).toString().replace(/\n$/g, '').split('\n')
    else
        dirCids = fs.readdirSync(`${config.cachePath}/${dirId}`)
    if (dirCids.length === 0) return
    for (let i = 0; i < dirCids.length; i++) {
        let entryFile = `${config.cachePath}/${dirId}/${dirCids[i]}/entry.json`, entry
        if (mode === 'adb') 
            entry = JSON.parse(execSync(`adb shell [ -f "${entryFile}" ] && adb shell cat "${entryFile}"`).toString())
        else 
            if (fs.existsSync(entryFile)) 
                entry = JSON.parse(fs.readFileSync(entryFile))
        let data = entryProcess(dirId, entry, mode)
        data.dirCid = dirCids[i]
        if (firstBreak) 
            return data
        else 
            datas.push(data)
    }
    return datas
}

function outputParse(entryData) {
    return config.output.replace('%TITLE%', entryData.title)
        .replace('%OWNER_NAME%', entryData.ownerName)
        .replace('%AVID%', entryData.avid)
        .replace('%BVID%', entryData.bvid)
        .replace('%PAGE_CID%', entryData.cid)
        .replace('%PAGE_NUM%', entryData.page)
        .replace('%FILE_SIZE%', entryData.size)
        .replace('%QUALITY%', entryData.qualityPithyDescription)
        .replace(`${entryData.pagePartStat ? '/%PAGE_TITLE%' : '%PAGE_TITLE%'}`, entryData.pageTitle)
}

function getCacheList(sep = '\n', childSep = '🔷', mode) {
    let items = { data: [], format: [] }, dirIds
    if (mode === 'adb') 
        dirIds = execSync(`adb shell ls "${config.cachePath}"`).toString().replace(/\n$/g, '').split('\n')
    else 
        dirIds = fs.readdirSync(config.cachePath)
    dirIds.forEach(e => {
        let entryData = getEntryData(e, true, mode)
        if (entryData === undefined) return
        items.data.push({
            id: entryData.dirId,
            title: entryData.title,
            size: entryData.size
        })
        items.format.push(`${entryData.dirId}${childSep}🔷${entryData.title}${childSep}${entryData.size}\t ${entryData.ownerName}`)
    })
    items.formatStr = items.format.join(sep)
    if (items === '') error('The offline cache is empty')
    return items
}

function extractVideo(dirId, forceAllow, clear, danmu) {
    let yes = forceAllow
    const entryData = getEntryData(dirId)
    entryData.forEach(e => {
        console.log(`INFO: child_id '${e.dirCid}': start extract...`)
        outputFile = outputParse(e)
        if (fs.existsSync(`${config.cachePath}/${dirId}/${e.dirCid}/${e.typeTag}/audio.m4s`) && fs.existsSync(`${config.cachePath}/${dirId}/${e.dirCid}/${e.typeTag}/video.m4s`)) {
            if ((!forceAllow) && fs.existsSync(`${outputFile}.mp4`)) {
                let stat = readline.question(`output '${outputFile}.mp4': already exists. Overwrite? [Y/n]:`)
                if (stat === 'y' || stat === 'Y') {
                    yes = true
                } else {
                    yes = false
                    return
                }
            }
            let rmDir = `&& rm -rf "${config.cachePath}/${dirId}/${e.dirCid}"`
            let copyDanmu = `&& cp -rf "${config.cachePath}/${dirId}/${e.dirCid}/danmaku.xml" "${outputFile}.xml"`
            let succeedMsg = '\033[32mextract succeed!\033[0m'
            execSync(`mkdir -p "${path.parse(outputFile).dir}" && ffmpeg -loglevel quiet -i "${config.cachePath}/${dirId}/${e.dirCid}/${e.typeTag}/video.m4s" -i "${config.cachePath}/${dirId}/${e.dirCid}/${e.typeTag}/audio.m4s" -c copy -movflags faststart -f mp4 "${outputFile}.mp4" ${yes === true ? '-y' : ''} ${danmu === true ? copyDanmu : ''} ${clear === true ? rmDir : ''}`)
            console.log(`INFO: output -> '${outputFile}.mp4'${danmu === true ? '\nINFO: danmu -> \'' + outputFile + '.xml\'' : ''}${clear === true ? '\nINFO: \'' + e.dirCid + '\' is clear' : ''}\nINFO: child_id '${e.dirCid}': ${succeedMsg}`)
        } else 
            error(`The '${e.dirCid}' video has not finished caching, '${outputFile}.mp4' Export cancel`)
    })
}

program
    .name(package.name)
    .version(package.version)
    .description(package.description)
    .option('-i, --input <dirId>', 'input dirId')
    .option('-y, --yes', 'force allow', config.forceAllow)
    .option('-cl, --clear', 'clear cache', config.clearCache)
    .option('-dm, --danmu', 'extract danmu', config.danmu)
    .action(opts => {
        const version = Number(execSync(`getprop ro.build.version.release`).toString().replace('\n', ''))
        config.permission = config.permission ?? (version >= 13 ? 'adb' : 'normal')
        config.adbPort = config.adbPort ?? '5555'
        config.stagePath = config.stagePath ?? '/storage/emulated/0/.bveStage/'
        try {
            console.log('\nWAIT...\n')
            adbConnect(config)
            adbRestore(config)
            if (opts.input) {
                let id = opts.input.match(/(^[0-9]{6,}\b|^s_[0-9]{2,}\b)/)
                adbRequire(config, id[0])
                console.log(`INFO: '${id[0]}' Extract...`)
                extractVideo(id[0], opts.yes, opts.clear, opts.danmu)
                config.cachePath = CACHE_PATH
                if (!config.clearCache) adbRestore(config)
            } else {
                let items = getCacheList(',', '\n', config.permission).formatStr
                let db = JSON.parse(
                    execSync(`termux-dialog checkbox -v '${items}' -t '请选择：'`).toString()
                )
                if (db.text === '[]') 
                    error('select empty')
                else if (db.code === -2)
                    error('select cancel')
                else if (db.code === -1) {
                    db.values.forEach(e => {
                        let id = e.text.match(/(^[0-9]{6,}\b|^s_[0-9]{2,}\b)/)
                        adbRequire(config, id[0])
                        console.log(`INFO: '${id[0]}' Extract...`)
                        extractVideo(id[0], opts.yes, opts.clear, opts.danmu)
                    })
                    config.cachePath = CACHE_PATH
                    if (!config.clearCache) adbRestore(config)
                }
            }
        } catch(err) {
            adbRestore(config)
            error(err.message)
        }
    })

program
    .command('ls')
    .description('list cache videos')
    .action(() => {
        try {
            console.log('\nWAIT...\n')
            console.log(getCacheList('\n\n', '\n', config.permission).formatStr)
        } catch(err) {
            error(err.message)
        }
    })

program.parse()