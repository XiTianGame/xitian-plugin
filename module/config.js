import chokidar from 'chokidar'
import PATH from 'node:path'
import lodash from 'lodash'
import url from 'node:url'
import fs from 'node:fs'
import YAML from 'yaml'


/** 配置文件 直接借鉴yunzai配置代码 */
class ConfigSet {
  constructor() {
    this.baseDir = PATH.join(url.fileURLToPath(import.meta.url), '../../')
    /** 默认设置 */
    this.defSetPath = this.baseDir + '/defSet/';
    this.defSet = {};

    /** 用户设置 */
    this.configPath = this.baseDir + '/config/';
    this.config = {};

    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} };

    this.ignore = ['char.set', 'help.set', 'lexicon.set', 'version.set'];
  }

  /**
   * 确认权限
   * @param e 消息
   */
  auth(e) {
    const permis = this.getConfig('auth', 'set')
    //是否允许群聊
    if (!permis.group && e.isGroup) {
      return false;
    }
    //获取授权QQ列表，没有就默认全部主人
    if (permis.grade.length == 0 && permis.accredit.length == 0) {
      permis.grade.push('master')
    }
    //判断权限
    if (
      (permis.grade.includes('master') && e.isMaster)
      || (permis.grade.includes('owner') && e?.sender?.role == 'owner')
      || (permis.grade.includes('admin') && e?.sender?.role == 'admin')
      || (permis.grade.includes('everyone'))
      || (permis.accredit.includes(e.user_id))
    ) {
      return true
    }
    //都不是就是未授权
    return false
  }

  /**
   * package.json
   * @returns {import('../package.json')}
   */
  get package() {
    if (this._package) return this._package

    this._package = JSON.parse(fs.readFileSync(this.baseDir + '/package.json', 'utf8'))
    return this._package
  }

  /** package.json */
  set package(data) {
    this._package = lodash.assign(this.package, data)
    fs.writeFileSync(this.baseDir + '/package.json', JSON.stringify(this._package, null, 2), 'utf8')
    return this._package
  }

  /**
   * 默认设置
   * @param {string} app  功能
   * @param {string} name 配置文件名称
   */
  getdefSet(app, name) {
    return this.getYaml(app, name, 'defSet');
  }

  /** 用户配置 */
  getConfig(app, name) {
    if (this.ignore.includes(`${app}.${name}`)) return this.getdefSet(app, name);
    this.checkConfig(app, name)

    return {
      ...this.getdefSet(app, name),
      ...this.getYaml(app, name, 'config'),
    };
  }

  /**
   * 获取配置yaml
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {'config'|'defSet'} type 默认跑配置-defSet，用户配置-config
   */
  getYaml(app, name, type = 'defSet') {
    const key = `${app}.${name}`;

    if (this[type][key]) return this[type][key].toJSON()

    this.checkConfig(app, name, type)
    const file = this.getFilePath(app, name, type)
    // 保留注释
    this[type][key] = YAML.parseDocument(fs.readFileSync(file, 'utf8'))

    this.watch(file, app, name, type)

    return this[type][key].toJSON()
  }

  /**
   * 获取配置文件路径
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {'config'|'defSet'} type 配置类型
   * @returns 
   */
  getFilePath(app, name, type) {
    if (type == 'defSet') return `${this.defSetPath}${app}/${name}.yaml`;
    else return `${this.configPath}${app}.${name}.yaml`;
  }

  /**
   * 监听配置文件
   * @param {string} file 文件路径
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {'config'|'defSet'} type 配置类型
   */
  watch(file, app, name, type = 'defSet') {
    const key = `${app}.${name}`;

    if (this.watcher[type][key]) return;

    const watcher = chokidar.watch(file);
    watcher.on('change', () => {
      delete this[type][key];
      logger.mark(`[修改配置文件][${type}][${app}][${name}]`);
      if (type == 'defSet') this.assign(app, name)
    });

    this.watcher[type][key] = watcher;
  }

  /**
   * 检查是否存在配置文件
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {'config'|'defSet'} type 配置类型
   */
  hasConfig(app, name, type = 'config') {
    const file = this.getFilePath(app, name, type)
    return fs.existsSync(file)
  }

  /**
   * 检查配置文件
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {'config'|'defSet'} type 配置类型
   */
  checkConfig(app, name, type = 'config') {
    if (!this.hasConfig(app, name, type)) {
      if (type == 'defSet') {
        throw new Error(`不存在默认配置文件[${app}][${name}]`)
      } else {
        this.cpCfg(app, name)
      }
    }
  }

  /**
   * 复制配置文件
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {boolean} force 覆盖原先设置
   */
  cpCfg(app, name, force = false) {
    let set = this.getFilePath(app, name, 'config');
    if (force || !fs.existsSync(set)) {
      fs.copyFileSync(this.getFilePath(app, name, 'defSet'), set);
    }
  }

  /**
   * 修改defSet后覆写config
   * @param {string} app 功能
   * @param {string} name 名称
   */
  assign(app, name) {
    const file = this.getFilePath(app, name, 'config')
    if (!fs.existsSync(file)) {
      this.cpCfg(app, name)
      return true
    }
    const config = this.getConfig(app, name)
    this.cpCfg(app, name, true)
    delete this.config[`${app}.${name}`]//太快了要手动删一下
    this.saveSet(app, name, 'config', config)
    return true
  }

  /**
   * 保存设置
   * @param {string} app 功能
   * @param {string} name 名称
   * @param {'config'|'defSet'} type 类型
   * @param {object} data 数据
   */
  saveSet(app, name, type, data) {
    const key = `${app}.${name}`;
    const file = this.getFilePath(app, name, type)
    if (!data) {
      logger.mark(`[重置配置文件][${type}][${app}][${name}]`)
      fs.existsSync(file) && fs.unlinkSync(file)
    } else if (lodash.isPlainObject(data)) {
      if (!this[type][key]) this.getYaml(app, name, type)
      /**
       * 递归设置数据
       * @param {object} obj 
       * @param {Array<string>} path 
       */
      const setIn = (obj, path = []) => {
        lodash.forEach(obj, (value, k) => {
          if (lodash.isPlainObject(value)) {
            setIn(value, path.concat(k))
          } else {
            this[type][key].setIn(path.concat(k), value)
          }
        })
      }
      setIn(data)
      fs.writeFileSync(file, this[type][key].toString(), 'utf8')
    }
    return true
  }
}

export default new ConfigSet();
