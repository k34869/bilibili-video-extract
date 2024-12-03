# bilibili video extract tool - 哔哩哔哩缓存视频提取工具

bilibili video extract tool for Android Termux.

Depends on the termux-api (`pkg install termux-api -y`)

## Usage

```shell
npm install bilibili-video-extract -g

# run bilibili video extract, Android 11 Higher Use adb permission
bve
```

## Help

```
Usage: bve [options] [command]

bilibili video extract tool

Options:
  -V, --version                    output the version number
  -i, --input <dirId>              input dirId
  -y, --yes                        force allow
  -cl, --clear                     clear cache
  --extract-danmu                  extract danmu
  --download-cover                 download cover
  -ft, --filter-title <filterStr>  filter title
  -fu, --filter-uname <filterStr>  filter uname
  -h, --help                       display help for command

Commands:
  ls [options]                     list cache videos
```