import plugin from '../../../lib/plugins/plugin.js'
import install from '../module/install.js'
import config from '../module/config.js'
import PATH from 'node:path'
import fs from 'node:fs'


export class Install extends plugin {
  constructor() {
    super({
      name: '插件安装',
      dsc: '进行安装和新增插件操作',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5,
      rule: [
        {
          reg: '^#(安装|新增|增加)插件(https:\/\/(github|gitee).com\/[a-zA-Z0-9-]{1,39}\/[a-zA-Z0-9_-]{1,100}(.git)?)?$',
          fnc: 'new'
        },
        {
          reg: '^#开始批量安装插件$',
          fnc: 'batch'
        },
        {
          reg: '^#清空回收站',
          fnc: 'clear'
        }
      ]
    })
  }

  get config() {
    return config.getConfig('js', 'set');
  }

  get groups() {
    return config.getConfig('group', 'set');
  }

  //安装指令
  async new(e) {
    if (!config.auth(e)) {
      return true;
    }
    //判断是否包含git链接
    let url = e.msg.replace(/#|安装|新增|增加|插件/g, '');
    if (url) {
      return install.clone(e, url);
    }
    //是否包含文件
    if (!e.file) {
      this.setContext('install', e.isGroup, this.config.timeout)
      e.reply('请发送js插件');
      return true;
    }

    return this.install(e);//消息包含js文件，直接安装
  }

  async batch(e) {
    if (!config.auth(e)) {
      return true;
    }

    this.e.batch = true
    this.setContext('install', e.isGroup, this.config.timeout)
    e.reply('已开始批量安装，请发送js插件\n结束批量安装使用：#结束批量安装')
  }

  async install(e) {
    if (!config.auth(this.e)) {
      return false;
    }

    if (new RegExp('^#取消安装(插件)?$').test(this.e.msg)) {
      this.finish('install', this.e.isGroup)
      this.e.reply('安装已取消')
      return true
    }

    //防止人机合一
    if (this.e.raw_message.includes('发送非js文件，已取消本次安装') || this.e.raw_message.includes('已开始批量安装')) {
      return false;
    }

    let error = false

    this.finish('install', this.e.isGroup)
    //批量安装
    if (e.batch) {
      if (new RegExp('^#结束批量安装(插件)?$').test(this.e.msg)) {
        this.e.reply('已结束批量安装')
        return true
      }
      this.e.batch = true
      this.setContext('install', this.e.isGroup, this.config.timeout)
    }

    if (!this.e.file || !this.e.file.name.endsWith('.js')) {
      this.e.reply('发送非js文件，已取消本次安装')
      error = true
    }

    if (this.e.message[0]?.size > this.config.maxSize) {
      this.e.reply('文件过大，已取消本次安装');
      error = true
    }

    //有错误不走行安装逻辑
    if (error) return true

    //获取下载链接
    const fileUrl = await this.e[this.e.isGroup ? 'group' : 'friend'].getFileUrl(this.e.file.fid)
    const savePath = PATH.join('./plugins', this.config.default_group, this.e.file.name)
    await install.install(this.e, fileUrl, savePath);//调用安装函数
    return true;
  }

  async clear(e) {
    if (!config.auth(e)) {
      return true;
    }
    e.reply('警告！此操作会清空回收站内的全部插件且无法找回！\n是否继续（是/否）')
    this.setContext('delete', e.isGroup, this.config.timeout)
    return true;
  }

  async delete() {
    switch (this.e.msg) {
      case '是':
        let files = fs.readdirSync(this.groups.bin);
        files.forEach(item => {
          //rm暴力删除
          fs.rmSync(PATH.join(this.groups.bin, item), { recursive: true, force: true })
        });
        this.e.reply('插件回收站已清空')
        this.finish('delete', this.e.isGroup)
        break;
      case '否':
        this.e.reply('操作已取消')
        this.finish('delete', this.e.isGroup);
        break;
      default:
        this.e.reply('请发送（是/否）进行选择')
        return false;
    }
    return false;
  }
}