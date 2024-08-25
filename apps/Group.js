import plugin from '../../../lib/plugins/plugin.js'
import config from '../module/config.js'
import loader from '../module/loader.js'
import PATH from 'node:path'
import fs from 'node:fs'

const WAITFLAG = Symbol('WAITFLAG')

export class Group extends plugin {
  constructor() {
    super({
      name: '分组',
      dsc: '提供js插件分组管理',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5,
      rule: [
        {
          reg: '^#分组列表$',
          fnc: 'list'
        },
        {
          reg: '^#创建分组(.*)$',
          fnc: 'new'
        },
        {
          reg: '^#删除分组(.*)$',
          fnc: 'del'
        },
        {
          reg: '^#(.*)设置分组(.*)$',
          fnc: 'set'
        },
        {
          reg: '^#同步分组$',
          fnc: 'sync'
        }
      ]
    })
  }

  get groups() {
    return config.getConfig('group', 'set')
  }

  get exclude() {
    return config.getConfig('exclude', 'set')
  }

  get config() {
    return config.getConfig('js', 'set')
  }

  async list(e) {
    if (!config.auth(e)) {
      return true
    }

    let msg = ['====分组列表====']
    this.groups.group.forEach(item => {
      msg.push(`\n${item}`)
    })
    e.reply(msg)
    return true
  }

  async new(e) {
    if (!config.auth(e)) {
      return true
    }

    let group = e.msg.replace('#创建分组', '');
    if (this.groups.group.includes(group)) {
      e.reply('已经存在该分组了')
      return true
    }
    const path = PATH.join('./plugins', group)
    const groups = this.groups
    groups.group.push(group)
    config.saveSet('group', 'set', 'config', groups)
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
    e.reply('创建分组成功')
    return true
  }

  async del(e) {
    if (!config.auth(e)) {
      return true
    }

    let group = e.msg.replace('#删除分组', '')
    //删除路径
    let path = PATH.join('./plugins', group)
    if (fs.existsSync(path) && fs.statSync(path).isDirectory()) {
      if (fs.readdirSync(path).length > 0) {
        e.reply('该分组内不为空，请清理分组内插件后重试')
        return true
      } else {
        fs.rmdirSync(path)
      }
    } else {
      e.reply('不存在该分组文件夹哦~');
    }
    //判断一下分组的位置
    if (this.groups.group.includes(group)) {
      const groups = this.groups
      groups.group = groups.group.filter(g => g !== group)
      config.saveSet('group', 'set', 'config', groups)
      e.reply('删除成功！')
    } else {
      e.reply('不存在该分组配置')
    }
    return true;
  }

  async set(e) {
    if (!config.auth(e)) {
      return true
    }

    let keyword = e.msg.replace('#', '').split('设置分组');
    if(!this.groups.group.includes(keyword[1])) {
      e.reply(`不存在分组< ${keyword[1]} >`)
      return true
    }
    //获取全部分组
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
      this.finish('set', this.e.isGroup)
      if (index === 0) {
        this.e.reply('操作已取消')
        return true
      }
      tmp = [e[WAITFLAG][index - 1]]
    }
    if (!tmp) tmp = loader.find(keyword[0], loader.GROUP, true)
    switch(tmp.length) {
      case 0:
        e.reply('没有找到插件：' + keyword[0])
        break
      case 1:
        fs.renameSync(tmp[0].Abpath, PATH.join('./plugins', keyword[1], tmp[0].file))
        e.reply(`成功设置插件< ${keyword[0]} >为分组< ${keyword[1]} >`)
        break
      default:
        this.setContext('set', this.e.isGroup, this.config.timeout)
        this.e[WAITFLAG] = tmp
        this.e.reply([
          '找到多个插件，请发送序号指定插件',
          '\n0 - 取消本次操作',
          ...tmp.map((item, i) => '\n' + (i + 1) + item.file)
        ])
    }
    return true
  }

  async sync(e) {
    if (!config.auth(e)) {
      return true
    }

    const groups = this.groups
    groups.group = []//清空一下group
    let ignore = this.exclude.rule//排除列表
    ignore.push(PATH.basename(this.groups.bin))//排除列表加上辣姬箱目录
    fs.readdirSync('./plugins').forEach(name => {
      let path = PATH.join('./plugins', name)
      if (fs.statSync(path).isDirectory()) {
        let key = fs.readdirSync(path)
        if (key.includes('index.js') || (fs.existsSync(PATH.join(path, '.git')) && fs.statSync(PATH.join(path, '.git')).isDirectory()) || ignore.includes(name)) return//匹配排除正则
        groups.group.push(name)
      }
    })
    config.saveSet('group', 'set', 'config', groups)
    e.reply(`同步完成！当前分组列表：`)
    this.list(e)
    return true
  }
}