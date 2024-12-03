#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const ora = require('ora')
const readline = require('readline-sync')
const { isEmpty } = require('lodash')
const { error } = require('./stdan')
const { configs, CACHE_PATH } = require('./defineConfig')
const { adbConnect, adbShell, adbPushExecFile } = require('./adbExec')
const { ffmpegPath } = adbConnect(adbPushExecFile)

function getDirSize(dirPath) {
    return adbShell(`du -h -d 0 "${dirPath}" | awk '{print $1}'`)
}

function entryProcess(dirId, entry) {
    let title = entry.title.replace(/\//g, '╱')
    let size = getDirSize(`${CACHE_PATH}/${dirId}`)
    if (dirId.search(/^s_/) === -1) {
        let pagePartStat = (entry.page_data.part === undefined) || (entry.page_data.part === entry.title)
        let { owner_name, avid, bvid, cover, type_tag, quality_pithy_description, page_data: { cid, page } } = entry
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
            cover,
            typeTag: type_tag,
            ownerName: owner_name,
            qualityPithyDescription: quality_pithy_description,
            pageTitle: pagePartStat ? '' : entry.page_data.part.replace(/\//g, '╱')
        }
    } else {
        let { cover, type_tag, source: { av_id: avid, cid, quality_pithy_description, website: owner_name }, ep: { page, bvid } } = entry
        return {
            title,
            avid,
            bvid,
            cid,
            page,
            size,
            dirId,
            cover,
            typeTag: type_tag,
            pagePartStat: false,
            ownerName: owner_name,
            qualityPithyDescription: quality_pithy_description,
            pageTitle: entry.ep.index_title === '' ? entry.ep.index : entry.ep.index_title
        }
    }
}

function getEntryData(options) {
    let { dirId, firstBreak, filter = {} } = options
    let datas = new Array, dirCids = adbShell(`ls "${CACHE_PATH}/${dirId}"`).split('\n')
    if (dirCids.length === 0) return
    for (let i = 0; i < dirCids.length; i++) {
        let entry, entryFile = `${CACHE_PATH}/${dirId}/${dirCids[i]}/entry.json`
        let isEntryFile = adbShell(`[ -f "${entryFile}" ] && echo YES || echo NO`)
        if (isEntryFile === 'YES') {
            entry = JSON.parse(adbShell(`cat "${entryFile}"`))
            if (filter.title && entry.title.indexOf(filter.title) === -1) 
                return
            if (filter.uname && entry.owner_name.indexOf(filter.uname) === -1) 
                return
        } else
            continue
        let data = entryProcess(dirId, entry)
        data.dirCid = dirCids[i]
        if (firstBreak) 
            return data
        else 
            datas.push(data)
    }
    return datas
}

function outputParse(entryData) {
    return configs.outputPath.replace('${TITLE}', entryData.title)
        .replace('${OWNER_NAME}', entryData.ownerName)
        .replace('${AVID}', entryData.avid)
        .replace('${BVID}', entryData.bvid)
        .replace('${PAGE_CID}', entryData.cid)
        .replace('${PAGE_NUM}', entryData.page)
        .replace('${FILE_SIZE}', entryData.size)
        .replace('${QUALITY}', entryData.qualityPithyDescription)
        .replace(`${entryData.pagePartStat ? '/${PAGE_TITLE}' : '${PAGE_TITLE}'}`, entryData.pageTitle)
}

function getCacheList(sep = '\n', childSep = '🔷', filter) {
    let items = { data: [], format: [] }, dirIds = adbShell(`ls "${CACHE_PATH}"`).split('\n')
    dirIds.forEach(e => {
        let entryData = getEntryData({dirId: e, firstBreak: true, filter})
        if (isEmpty(entryData)) return
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

function extractVideo(options) {
    let { dirId, forceAllow: yes = false, clear = false, danmu = true, cover = false } = options, entryData = getEntryData({dirId})
    entryData.forEach((e, i) => {
        console.log(`INFO: child_id '${e.dirCid}': start extract...`)
        let outputFile = outputParse(e)
        let isVideoFile = adbShell(`[ -f "${CACHE_PATH}/${dirId}/${e.dirCid}/${e.typeTag}/audio.m4s" ] && echo YES || echo NO`)
        let isAudioFile = adbShell(`[ -f "${CACHE_PATH}/${dirId}/${e.dirCid}/${e.typeTag}/video.m4s" ] && echo YES || echo NO`)
        if (isVideoFile === 'YES' && isAudioFile === 'YES') {
            if ((!yes) && fs.existsSync(`${outputFile}.mp4`)) {
                const stat = readline.question(`output '${outputFile}.mp4': already exists. Overwrite? [Y/n]:`)
                if (stat === 'y' || stat === 'Y') {
                    yes = true
                } else {
                    yes = false
                    return
                }
            }
            if (cover && i === 0) {
                const spinner1 = ora('WAITING...\n').start()
                const { ext } = path.parse(e.cover)
                const { dir } = path.parse(outputFile)
                exec(`curl -s "${e.cover}" -o "${dir}/${e.title}-cover${ext}"`, (err) => {
                    if (err) error(err.message)
                    spinner1.stop()
                    console.log(`INFO: cover -> '${dir}/${e.title}-cover${ext}'`)
                })
            }
            const rmDir = `&& rm -rf "${CACHE_PATH}/${dirId}/${e.dirCid}"`
            const copyDanmu = `&& cp -rf "${CACHE_PATH}/${dirId}/${e.dirCid}/danmaku.xml" "${outputFile}.xml"`
            const extractCommand = `${ffmpegPath} -loglevel quiet -i "${CACHE_PATH}/${dirId}/${e.dirCid}/${e.typeTag}/video.m4s" -i "${CACHE_PATH}/${dirId}/${e.dirCid}/${e.typeTag}/audio.m4s" -c copy -movflags faststart -f mp4 "${outputFile}.mp4" ${yes === true ? '-y' : ''} ${danmu === true ? copyDanmu : ''} ${clear === true ? rmDir : ''}`
            fs.writeFileSync(`${__dirname}/extractCommand.sh`, extractCommand, 'utf8')
            const succeedMsg = '\033[32m✅️extract succeed!\033[0m'
            const spinner2 = ora('WAITING...\n').start()
            exec(`mkdir -p "${path.parse(outputFile).dir}" && cat "${__dirname}/extractCommand.sh" | adb -s 127.0.0.1:5555 shell sh`, (err) => {
                if (err) 
                    error(err.message)
                spinner2.stop()
                console.log(`INFO: video -> '${outputFile}.mp4'${danmu === true ? '\nINFO: danmu -> \'' + outputFile + '.xml\'' : ''}\nINFO: child_id '${e.dirCid}': ${succeedMsg}${clear === true ? '\nINFO: \'' + e.dirCid + '\' is cleared' : ''}`)
            })
        } else 
            error(`The '${e.dirCid}' video has not finished caching, '${outputFile}.mp4' Export cancel`)
    })
}

module.exports = {
    getCacheList,
    extractVideo
}