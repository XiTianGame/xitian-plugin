import plugin from '../../../lib/plugins/plugin.js'
import lodash from 'lodash'
import Version from "../module/version.js";
import { Restart } from "../../other/restart.js";
import { exec, execSync } from "child_process";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import ConfigSet from "../module/ConfigSet.js";


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

        this.versionData = ConfigSet.getdefSet("version", "set");
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
     * rule - 插件版本信息
     * 来自闲心，先撂这里
     */
    async version() {
        const data = await new Version(this.e).getData(
            this.versionData.slice(0, 3)
        );
        let img = await puppeteer.screenshot("version", data);
        this.e.reply(img);
    }

    /**
     * 检查git是否安装
     * @returns
    */
    async checkGit() {
        let ret = await execSync('git --version', { encoding: 'utf-8', windowsHide: true })
        if (!ret || !ret.includes('git version')) {
            await this.reply('请先安装git')
            return false
        }

        return true
    }

    /**
     * 执行命令的东东
     * @param {string} cmd git命令
     * @returns
     */
    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
                resolve({ error, stdout, stderr })
            })
        })
    }

    async runUpdate() {
        this.isNowUp = false

        let cm = 'git -C ./plugins/xitian-plugin/ pull --no-rebase'

        let type = '更新'
        //判断是不是强制更新
        if (this.e.msg.includes('强制')) {
            type = '强制更新'
            cm = `git -C ./plugins/xitian-plugin/ checkout . && ${cm}`
        }
        /** 获取上次提交的commitId，用于获取日志时判断新增的更新日志 */
        this.oldCommitId = await this.getcommitId("xitian-plugin")

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

        let time = await this.getTime("xitian-plugin")

        if (/Already up|已经是最新/g.test(ret.stdout)) {
            await this.reply(`插件管理器已经是最新\n最后更新时间：${time}`)
        } else {
            await this.reply(`插件管理器更新成功\n更新时间：${time}`)
            this.isUp = true
            let log = await this.getLog("xitian-plugin")
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

        let commitId = await execSync(cm, { encoding: 'utf-8', windowsHide: true })
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
            time = await execSync(cm, { encoding: 'utf-8', windowsHide: true })
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

        let logAll
        try {
            logAll = await execSync(cm, { encoding: 'utf-8', windowsHide: true })
        } catch (error) {
            logger.error(error.toString())
            this.reply(error.toString())
        }

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

        log = await this.makeForwardMsg(`${plugin || 'xitian-plugin'}更新日志，共${line}条`, log, end)

        return log
    }

    /**
     * 制作转发消息
     * @param {string} title 标题 - 首条消息
     * @param {string} msg 日志信息
     * @param {string} end 最后一条信息
     * @returns
     */
    async makeForwardMsg(title, msg, end) {
        let nickname = Bot.nickname
        if (this.e.isGroup) {
            let info = await Bot.getGroupMemberInfo(this.e.group_id, Bot.uin)
            nickname = info.card ?? info.nickname
        }
        let userInfo = {
            user_id: Bot.uin,
            nickname
        }

        let forwardMsg = [
            {
                ...userInfo,
                message: title
            },
            {
                ...userInfo,
                message: msg
            }
        ]

        if (end) {
            forwardMsg.push({
                ...userInfo,
                message: end
            })
        }

        /** 制作转发内容 */
        if (this.e.isGroup) {
            forwardMsg = await this.e.group.makeForwardMsg(forwardMsg)
        } else {
            forwardMsg = await this.e.friend.makeForwardMsg(forwardMsg)
        }

        /** 处理描述 */
        if(typeof forwardMsg.data === 'object') {
            let detail = forwardMsg.data?.meta?.detail
            if (detail) {
                detail.news = [{ text: dec }]
            }
        } else if(typeof forwardMsg.data === 'string') {
            forwardMsg.data = forwardMsg.data
                .replace(/\n/g, '')
                .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
                .replace(/___+/, `<title color="#777777" size="26">${title}</title>`)
        }

        return forwardMsg
    }

    /*
     *更新日志的方法
     */
    async updateLog() {
        let log = await this.getLog()
        await this.reply(log)
    }
}
