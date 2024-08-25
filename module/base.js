import cfg from '../../../lib/config/config.js'
import config from './config.js'

export default class base {
  constructor(e = {}) {
    this.e = e;
    this.userId = e?.user_id;
    this.model = 'xitian-plugin';
    this._path = process.cwd().replace(/\\/g, '/');
    this.yunzai = 'Yunzai-Bot'
    if (cfg.package.name === 'miao-yunzai') {
      this.yunzai = 'Miao-Yunzai'
    } else if (cfg.package.name === 'trss-yunzai') {
      this.yunzai = 'TRSS-Yunzai'
    } 
    else if (cfg.package.name === 'a-yunzai') {
      this.yunzai = 'A-Yunzai'
    }
  }

  get prefix() {
    return `Yz:xitian-plugin:${this.model}:`;
  }

  /**
   * 截图默认数据
   * @param saveId html保存id
   * @param tplFile 模板html路径
   * @param pluResPath 插件资源路径
   */
  get screenData() {
    return {
      saveId: this.userId,
      yunzai: this.yunzai + ' ' + cfg.package.version,
      xitian: `Xitian-Plugin ${config.package.version}`,
      tplFile: `./plugins/xitian-plugin/resources/html/${this.model}/${this.model}.html`,
      /** 绝对路径 */
      pluResPath: `${this._path}/plugins/xitian-plugin/resources/`,
    };
  }
}
