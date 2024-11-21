# bilibili video extract tool

bilibili video extract tool for Android Termux.

## Usage

```shell
git clone https://gitee.com/k34869/bilibili-video-extract.git
cd bilibili-video-extract
npm install
npm link

# run bilibili video extract, Android 13 Higher Use adb permission
bve
```

## Help

```
Usage: bve [options] [command]

bilibili video extract tool.

Options:
  -V, --version        output the version number
  -i, --input <dirId>  input dirId
  -y, --yes            force allow
  -cl, --clear         clear cache (default: true)
  -dm, --danmu         extract danmu (default: true)
  -h, --help           display help for command

Commands:
  ls                   list cache videos
```