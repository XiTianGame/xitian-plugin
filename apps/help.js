import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import plugin from '../../../lib/plugins/plugin.js'
import config from '../module/config.js'
import Help from '../module/help.js'
import md5 from 'md5'

let helpData = {
  md5: '',
  img: '',
};

export class help extends plugin {
  constructor() {
    super({
      name: '插件帮助',
      dsc: '发送插件管理器使用帮助',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5,
      rule: [
        {
          reg: '^#插件(管理器)?(菜单|帮助|help)$',
          fnc: 'help'
        }
      ]
    })
  }

  async help(e) {
    if (!config.auth(e)) {
      return true;
    }
    let data = await Help.get(this.e);

    if (!data) return;
    let img = await this.cache(data);
    await this.reply(img);
  }

  async cache(data) {
    let tmp = md5(JSON.stringify(data));
    if (helpData.md5 == tmp) return helpData.img;

    helpData.img = await puppeteer.screenshot('help', data);
    helpData.md5 = tmp;

    return helpData.img;
  }

}