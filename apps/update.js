import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import { Restart } from '../../other/restart.js'
import Version from '../module/version.js'
import { exec } from 'node:child_process'
import config from '../module/config.js'
import path from 'node:path'
import lodash from 'lodash'

let uping = false

export class update extends plugin {
  constructor() {
    super({
      name: '更新插件',
      dsc: '#更新 #强制更新',
      event: 'message',
      priority: 4000,
      rule: [
        {
          reg: '^#插件(管理器)?更新日志$',
          fnc: 'updateLog'
        },
        {
          reg: '^#插件(管理器)?(强制)*更新$',
          fnc: 'update'
        },
        {
          reg: '^#插件(管理器)?版本$',
          fnc: 'version'
        }
      ]
    })
  }

  get versionData() {
    return config.getdefSet('version', 'set')
  }

  async update() {
    if (!this.e.isMaster) return false
    //是不是在更新？
    if (uping) {
      await this.reply('已有命令更新中..请勿重复操作')
      return
    }
    //可能是其他的插件
    if (/详细|详情|面板|面版/.test(this.e.msg)) return false

    /** 检查git安装 */
    if (!await this.checkGit()) return

    /** 执行更新 */
    await this.runUpdate()

    /** 是否需要重启 */
    if (this.isUp) {
      // await this.reply('即将执行重启，以应用更新')
      setTimeout(() => this.restart(), 2000)
    }
  }

  /**
   * 插件版本信息
   */
  async version() {
    const data = await new Version(this.e).getData(
      this.versionData.slice(0, 3)
    );
    let img = await puppeteer.screenshot('version', data);
    this.e.reply(img);
  }

  /**
   * 检查git是否安装
   * @returns
  */
  async checkGit() {
    let ret = await this.execSync('git --version', { encoding: 'utf-8' }).then(res => res.stdout)
    if (!ret || !ret.includes('git version')) {
      await e.reply('请先安装git')
      return false
    }
    return true
  }

  /**
   * 执行cmd命令
   * @param {string} cmd git命令
   * @returns {Promise<{error:Error|null,stdout:string,stderr:string}>}
   */
  async execSync(cmd) {
    return new Promise(resolve => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  async runUpdate() {
    this.isNowUp = false

    let cm = `git -C ./plugins/${path.basename(config.baseDir)}/ pull --no-rebase`

    let type = '更新'
    //判断是不是强制更新
    if (this.e.msg.includes('强制')) {
      type = '强制更新'
      cm = `git -C ./plugins/${path.basename(config.baseDir)}/ checkout . && ${cm}`
    }
    /** 获取上次提交的commitId，用于获取日志时判断新增的更新日志 */
    this.oldCommitId = await this.getcommitId(path.basename(config.baseDir))

    logger.mark(`${this.e.logFnc} 开始${type}：插件管理器`)

    await this.reply(`开始${type}：插件管理器`)
    uping = true
    let ret = await this.execSync(cm)
    uping = false

    if (ret.error) {
      logger.mark(`${this.e.logFnc} 插件管理器更新失败！`)
      this.gitErr(ret.error, ret.stdout)
      return false
    }

    let time = await this.getTime(path.basename(config.baseDir))

    if (/Already up|已经是最新/g.test(ret.stdout)) {
      await this.reply(`插件管理器已经是最新\n最后更新时间：${time}`)
    } else {
      await this.reply(`插件管理器更新成功\n更新时间：${time}`)
      this.isUp = true
      let log = await this.getLog(path.basename(config.baseDir))
      await this.reply(log)
    }

    logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)

    return true
  }

  async getcommitId(plugin = '') {
    let cm = 'git rev-parse --short HEAD'
    if (plugin) {
      cm = `git -C ./plugins/${plugin}/ rev-parse --short HEAD`
    }

    let commitId = await this.execSync(cm, { encoding: 'utf-8', windowsHide: true }).then(res => res.stdout)
    commitId = lodash.trim(commitId)

    return commitId
  }

  async getTime(plugin = '') {
    let cm = 'git log  -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"'
    if (plugin) {
      cm = `cd ./plugins/${plugin}/ && git log -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"`
    }

    let time = ''
    try {
      time = await this.execSync(cm, { encoding: 'utf-8', windowsHide: true }).then(res => res.stdout)
      time = lodash.trim(time)
    } catch (error) {
      logger.error(error.toString())
      time = '获取时间失败'
    }

    return time
  }

  /**
   * 处理更新失败的相关函数
   * @param {string} err
   * @param {string} stdout
   * @returns
   */
  async gitErr(err, stdout) {
    let msg = '更新失败！'
    let errMsg = err.toString()
    stdout = stdout.toString()

    if (errMsg.includes('Timed out')) {
      let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      await this.reply(msg + `\n连接超时：${remote}`)
      return
    }

    if (/Failed to connect|unable to access/g.test(errMsg)) {
      let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      await this.reply(msg + `\n连接失败：${remote}`)
      return
    }

    if (errMsg.includes('be overwritten by merge')) {
      await this.reply(msg + `存在冲突：\n${errMsg}\n` + '请解决冲突后再更新，或者执行#强制更新，放弃本地修改')
      return
    }

    if (stdout.includes('CONFLICT')) {
      await this.reply([msg + '存在冲突\n', errMsg, stdout, '\n请解决冲突后再更新，或者执行#强制更新，放弃本地修改'])
      return
    }

    await this.reply([errMsg, stdout])
  }

  restart() {
    new Restart(this.e).restart()
  }

  /**
   * 获取插件更新日志
   * @param {string} plugin 插件名称
   * @returns
   */
  async getLog(plugin = '') {
    let cm = 'git log  -20 --oneline --pretty=format:"%h||[%cd]  %s" --date=format:"%m-%d %H:%M"'
    if (plugin) {
      cm = `cd ./plugins/${plugin}/ && ${cm}`
    }

    let logAll = await this.execSync(cm, {cwd: path.join()})
    if (logAll.error) {
      logger.error(logAll.error)
      this.reply(logAll.error.toString())
    }
    logAll = logAll.stdout

    if (!logAll) return false

    logAll = logAll.split('\n')

    let log = []
    for (let str of logAll) {
      str = str.split('||')
      if (str[0] == this.oldCommitId) break
      if (str[1].includes('Merge branch')) continue
      log.push(str[1])
    }
    let line = log.length
    log = log.join('\n\n')

    if (log.length <= 0) return ''

    let end = ''
    if (!plugin) {
      end = '更多详细信息，请前往github查看\nhttps://github.com/XiTianGame/xitian-plugin'
    }

    const title = `${plugin || path.basename(config.baseDir)}更新日志，共${line}条`

    const forwardMsg = [title, log, end]
    log = await common.makeForwardMsg(this.e, forwardMsg, title)

    return log
  }

  /*
   *更新日志的方法
   */
  async updateLog() {
    let log = await this.getLog(path.basename(config.baseDir))
    await this.reply(log)
  }
}