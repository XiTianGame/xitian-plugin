import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import plugin from '../../../lib/plugins/plugin.js'
import config from '../module/config.js'
import loader from '../module/loader.js'
import list from '../module/list.js'
import YAML from 'yaml'


export class List extends plugin {
  constructor() {
    super({
      name: '插件列表',
      dsc: '查看js和大型插件',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#插件列表$',
          fnc: 'read'
        },
        {
          reg: '^#查看回收站$',
          fnc: 'look'
        }
      ]
    })
  }

  get groups() {
    return config.getConfig('group', 'set')
  }

  async read(e) {
    if (!config.auth(e)) {
      return true;
    }
    const data = await new list(e).getData();

    let img = await puppeteer.screenshot('list', data);
    e.reply(img)
    return true;
  }

  async look(e) {
    if (!config.auth(e)) {
      return true;
    }
    // 同步读取bin目录下的所有文件
    const files = loader.find('', loader.BIN)
    let msg = []
    files.forEach(item => {
      msg.push(item.key)
    })
    e.reply(`回收站的插件：\n${msg.join('\n')}\n恢复请用：#恢复插件+名字`);
    return true;
  }
}