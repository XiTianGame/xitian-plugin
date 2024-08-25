import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
import uninstall from '../module/uninstall.js'
import config from '../module/config.js'
import loader from '../module/loader.js'
import PATH from 'node:path'
import fs from 'node:fs'

const WAITFLAG = Symbol('WAITFLAG')

export class Manager extends plugin {
  constructor() {
    super({
      name: '插件管理',
      dsc: '各种功能帮助master管理js插件',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5,
      rule: [
        {
          reg: '^#查找插件(.*)$',
          fnc: 'find'
        },
        {
          reg: '^#停用插件(.*)$',
          fnc: 'mv_ty'
        },
        {
          reg: '^#启用插件(.*)$',
          fnc: 'mv_qy'
        },
        {
          reg: '^#(彻底)?删除插件(.*)$',
          fnc: 'del'
        },
        {
          reg: '^#恢复插件(.*)$',
          fnc: 'rec'
        },
        {
          reg: '^#插件(.*)重命名(.*)$',
          fnc: 'rename'
        },
        {
          reg: '^#查看插件(.*)$',
          fnc: 'upload'
        }
      ]
    })
  }

  get groups() {
    return config.getConfig('group', 'set')
  }

  get config() {
    return config.getConfig('js', 'set')
  }

  init() {
    for (let name of this.groups.group) {
      name = PATH.join('./plugins', name)
      if (!fs.existsSync(name)) {
        fs.mkdirSync(name);
      }
    }
  }

  async find(e) {
    if (!config.auth(e)) {
      return true
    }
    //获取关键字
    let keyword = e.msg.replace(/#查找插件|.js|.bak/g, '')
    let plugininfo = loader.find(keyword)
    switch (plugininfo.length) {
      case 0:
        e.reply('没有找到该插件，请确认你是否安装了该插件')
        break
      case 1:
        e.reply([
          `找到插件：${plugininfo[0].key}\n`,
          `位于分组：${plugininfo[0].group}\n`,
          `当前状态：${plugininfo[0].state}`
        ])
        break
      default:
        e.reply('找到多个插件')
        let msg = []
        for (let item of plugininfo) {
          let info = [
            `找到插件：${item.key}\n`,
            `位于分组：${item.group}\n`,
            `当前状态：${item.state}`
          ]
          msg.push({
            message: info,
            nickname: Bot.nickname,
            user_id: cfg.qq
          })
        }
        //判断是不是群聊，制作合并转发消息
        if (e.isGroup) {
          msg = await e.group.makeForwardMsg(msg)
        } else {
          msg = await e.friend.makeForwardMsg(msg)
        }
        await e.reply(msg)
    }
    return true;
  }

  async mv_ty(e) {
    if (!config.auth(this.e)) {
      return true
    }

    // 停用插件，添加.bak的后缀名
    let msg = this.e.msg.replace('#停用插件', '')
    let tmp
    if (e[WAITFLAG]) {
      const index = Number(this.e.msg)
      if (Number.isNaN(index)) {
        this.e.reply('请发送序号数字')
        return true
      }
      if (index > e[WAITFLAG].length) {
        this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
        return true
      }
      this.finish('mv_ty', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(msg, loader.GROUP, true)
    switch (tmp.length) {
      case 0:
        this.e.reply('没有找到该插件')
        break;
      case 1:
        switch (tmp[0].state) {
          case '启用':
            fs.renameSync(tmp[0].Abpath, PATH.join('./plugins', tmp[0].group, tmp[0].file + '.bak'))
            this.e.reply(`已停用< ${tmp[0].key} >` + '立即生效')
            break;
          case '停用':
            this.e.reply('该插件已经处于停用状态')
            break;
          case '已删除':
            this.e.reply('该插件处于已删除状态，请先恢复插件')
            break;
          default:
            this.e.reply('该插件状态异常，请确认你指定了有效的插件')
        }
        break;
      default:
        this.setContext('mv_ty', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
        ])
    }
    return true
  }

  async mv_qy(e) {
    if (!config.auth(this.e)) {
      return true
    }

    // 启用插件，去除.bak的后缀名
    let msg = this.e.msg.replace('#启用插件', '')
    let tmp
    if (e[WAITFLAG]) {
      const index = Number(this.e.msg)
      if (Number.isNaN(index)) {
        this.e.reply('请发送序号数字')
        return true
      }
      if (index > e[WAITFLAG].length) {
        this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
        return true
      }
      this.finish('mv_qy', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(msg, loader.GROUP, true)
    switch (tmp.length) {
      case 0:
        this.e.reply('没有找到该插件');
        break;
      case 1:
        switch (tmp[0].state) {
          case '启用':
            this.e.reply('该插件已经处于启用状态');
            break;
          case '停用':
            fs.renameSync(tmp[0].Abpath, PATH.join('./plugins', tmp[0].group, tmp[0].file.replace(/.bak$/, '')))
            e.reply(`已启用：< ${tmp[0].key} >` + '立即生效')
            break;
          case '已删除':
            e.reply('该插件处于已删除状态，请先恢复插件');
            break;
          default:
            e.reply('该插件状态异常，请确认你指定了有效的插件');
        }
        break;
      default:
        this.setContext('mv_qy', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
        ])
    }
    return true;
  }

  async del(e) {
    if (!config.auth(this.e)) {
      return true
    }
    let msg = this.e.msg.replace('#', '')
    //检查是否是大型插件
    if (await uninstall.removePlugin(e)) return true;

    //彻底删除，直接删除该文件
    if (msg.startsWith('彻底')) {
      this.setContext('fullDel', this.e.isGroup, this.config.timeout);
      await e.reply('(是|否)确认删除该插件？彻底删除后再也找不回来了哦');
      return true
    } else {
      msg = msg.replace('删除插件', '')
    }

    //删除插件，移动到回收站
    let tmp
    if (e[WAITFLAG]) {
      const index = Number(this.e.msg)
      if (Number.isNaN(index)) {
        this.e.reply('请发送序号数字')
        return true
      }
      if (index > e[WAITFLAG].length) {
        this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
        return true
      }
      this.finish('del', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(msg, loader.GROUP, true)
    switch (tmp.length) {
      case 0:
        e.reply('没有找到该插件')
        break;
      case 1:
        switch (tmp[0].state) {
          case '启用':
          case '停用':
            break
          case '已删除':
            e.reply('该插件已经是删除状态')
            return true
          default:
            e.reply('该插件状态异常，请确认你指定了有效的插件')
            return true
        }
        fs.renameSync(tmp[0].Abpath, PATH.join(this.groups.bin, `[${tmp[0].group}]${tmp[0].file + (tmp[0].file.endsWith('.bak') ? '' : '.bak')}`))
        e.reply(`已删除：< ${tmp[0].key} >` + '立即生效')
        break
      default:
        this.setContext('del', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
        ])
    }
    return true;
  }

  async fullDel(e) {
    if (!config.auth(this.e)) {
      return true
    }
    if (!this.e.msg) return true
    switch (e[WAITFLAG] || this.e.msg) {
      case '是':
      case e[WAITFLAG]:
        let msg = e.msg.replace('#彻底删除插件', '')
        let tmp
        if (e[WAITFLAG]) {
          const index = Number(this.e.msg)
          if (Number.isNaN(index)) {
            this.e.reply('请发送序号数字')
            return true
          }
          if (index > e[WAITFLAG].length) {
            this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
            return true
          }
          this.finish('fullDel', this.e.isGroup)
          if (index === 0) {
            this.e.reply('操作已取消')
            return true
          }
          tmp = [e[WAITFLAG][index - 1]]
        } else {
          this.finish('fullDel', this.e.isGroup)
        }
        if (!tmp) tmp = loader.find(msg, loader.GROUP, true)
        switch (tmp.length) {
          case 0:
            this.e.reply('没有找到该插件');
            break
          case 1:
            fs.unlinkSync(tmp[0].Abpath);
            this.e.reply(`已经彻底删除插件< ${tmp[0].key} >`)
            break
          default:
            this.setContext('fullDel', this.e.isGroup, this.config.timeout)
            this.e[WAITFLAG] = tmp
            this.e.reply([
              '找到多个插件，请发送序号指定插件',
              '\n0 - 取消本次操作',
              ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
            ])
        }
        break
      case '否':
        this.finish('fullDel', this.e.isGroup)
        this.e.reply('操作已取消')
        break
      default:
        if (!this.e.msg.includes('彻底删除后再也找不回来了哦') && !this.e.msg.includes('请回答 是/否 来进行操作')) {
          this.e.reply('请回答 是/否 来进行操作')
        }
    }
    return true
  }

  async rec(e) {
    if (!config.auth(e)) {
      return true;
    }

    // 恢复插件，去除.bak的后缀名
    let msg = e.msg.replace('#恢复插件', '')
    let tmp
    if (e[WAITFLAG]) {
      const index = Number(this.e.msg)
      if (Number.isNaN(index)) {
        this.e.reply('请发送序号数字')
        return true
      }
      if (index > e[WAITFLAG].length) {
        this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
        return true
      }
      this.finish('rec', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(msg, loader.BIN, true)
    //确定来源文件夹
    switch (tmp.length) {
      case 0:
        this.e.reply('没有找到该插件')
        break;
      case 1:
        switch (tmp[0].state) {
          case '启用':
            this.e.reply('该插件处于启用状态')
            break;
          case '停用':
            this.e.reply('该插件处于停用状态')
            break;
          case '已删除':
            //先确定有没有这个分组
            if (!fs.existsSync(PATH.join('./plugins', tmp[0].origin))) {
              e.reply(`没有找到< ${tmp[0].origin} >分组\n即将恢复至默认分组`)
              fs.renameSync(tmp[0].Abpath, PATH.join('./plugins', this.config.default_group, tmp[0].key + '.js'))
            } else {
              fs.renameSync(tmp[0].Abpath, PATH.join('./plugins', tmp[0].origin, tmp[0].key + '.js'));
            }
            e.reply(`已恢复：< ${tmp[0].key} >` + '立即生效')
            break
          default:
            e.reply('该插件状态异常,请确认你指定了有效的插件');
        }
        break;
      default:
        this.setContext('rec', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
        ])
    }
    return true;
  }

  async rename(e) {
    if (!config.auth(this.e)) {
      return true
    }

    let key = e.msg.replace('#插件', '').split('重命名')
    if (key.length > 2) {
      for (let num = 2; num < key.length; num++) {
        key[1] = key[1] + '重命名' + key[num];
      }
    }
    let tmp
    if (e[WAITFLAG]) {
      const index = Number(this.e.msg)
      if (Number.isNaN(index)) {
        this.e.reply('请发送序号数字')
        return true
      }
      if (index > e[WAITFLAG].length) {
        this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
        return true
      }
      this.finish('rename', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(key[0], loader.ALL, true)
    switch (tmp.length) {
      case 0:
        e.reply('未找到该插件')
        break;
      case 1:
        fs.renameSync(tmp[0].Abpath, PATH.join('./plugins', tmp[0].group, tmp[0].file.replace(key[0], key[1])))
        e.reply(`插件< ${key[0]} >重命名< ${key[1]} >成功`)
        break;
      default:
        this.setContext('rename', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
        ])
    }
    return true;
  }

  async upload(e) {
    if (!config.auth(e)) {
      return true;
    }

    let msg = e.msg.replace('#查看插件', '');
    let tmp
    if (e[WAITFLAG]) {
      const index = Number(this.e.msg)
      if (Number.isNaN(index)) {
        this.e.reply('请发送序号数字')
        return true
      }
      if (index > e[WAITFLAG].length) {
        this.e.reply(`序号需要在0-${e[WAITFLAG].length}内，收到：${index}`)
        return true
      }
      this.finish('upload', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(msg, loader.ALL, true)
    switch (tmp.length) {
      case 0:
        e.reply('未找到该插件')
        break;
      case 1:
        if (this.e.isGroup) {
          //上传到群文件
          this.e.group.fs.upload(tmp[0].Abpath)
        } else {
          //发送离线文件
          this.e.friend.sendFile(tmp[0].Abpath)
        }
        break
      default:
        this.setContext('upload', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => `\n${i + 1} - ${item.group}/${item.file}`)
        ])
    }
    return true
  }
}