import config from './config.js'
import chokidar from 'chokidar'
import * as acorn from 'acorn'
import PATH from 'node:path'
import lodash from 'lodash'
import fs from 'node:fs'

class pluginLoader {
  constructor() {
    /** @type {Map<string, object>} 插件储存 */
    this.plugins = new Map()
    /** 监听文件夹 */
    this.dir = './plugins'
    /** 垃圾桶 */
    this.bin = PATH.relative(this.dir, config.getConfig('group', 'set').bin)
    fs.existsSync(this.bin) || fs.mkdirSync(this.bin, { recursive: true })
    /** 插件包标志 */
    this.pkgFlag = ['index.js']
    fs.existsSync(this.dir) || fs.mkdirSync(this.dir, { recursive: true })

    /** @type {Set<string>} 插件包文件夹 */
    this.pluginPkg = new Set()
    /** @type {boolean} 插件是否加载完成 */
    this.loadReady = false
    //理论上加载一次就行
    this.load(false)
  }

  /**
   * 搜索标志ALL，查找全部
   */
  ALL = Symbol('ALL')

  /**
   * 搜索标志GROUP，除了回收站都查找
   */
  GROUP = Symbol('GROUP')

  /**
   * 搜索标志BIN，只查回收站
   */
  BIN = Symbol('BIN')

  /**
   * 默认分组
   * @returns {string}
   */
  get defGroup() {
    return config.getConfig('js', 'set').default_group || 'example'
  }

  /**
   * 加载插件
   * @param {boolean} isRefresh 是否刷新
   */
  async load(isRefresh = false) {
    if (this.watcher) {
      if (!isRefresh) return
      /**清空监听 */
      await this.watcher.close()
      this.pluginPkg.clear()
    }

    logger.info('[插件管理器]加载插件中...')

    this.watcher = chokidar.watch(
      [
        './',
        this.bin
      ],
      {
        depth: 1,
        cwd: this.dir,
        ignorePermissionErrors: true
      }
    ).on('all', (event, path) => {
      /* 是否是回收站 */
      const { dir, base, ext } = PATH.parse(path)
      if(!['addDir', 'unlinkDir'].includes(event) && !['.js', '.bak'].includes(ext)) return
      this[`deal${lodash.upperFirst(event)}`](dir, base).catch(err => {
        logger.error('[插件管理器]处理插件错误:', err)
      })
    }).on('ready', () => {
      this.loadReady = true
      logger.info(`[插件管理器]插件加载完成<${this.plugins.size}>个`)
    }).on('error', (err) => {
      logger.error('[插件管理器]监听插件错误:', err)
    })
  }

  /**
   * 根据名字查找插件
   * @param {string} name 插件名
   * @param {symbol|string} type 查找类型
   * @param {boolean} strict 是否精确查找
   */
  find(name, type = this.ALL, strict = false) {
    const result = []
    this.plugins.forEach(pluginInfo => {
      if (type === this.GROUP && pluginInfo.group === this.bin) return
      if (type === this.BIN && pluginInfo.group !== this.bin) return
      if (typeof type === 'string' && pluginInfo.group !== type) return
      if (strict && pluginInfo.key === name) {
        result.push(pluginInfo)
      } else if (pluginInfo.key.includes(name)) {
        result.push(pluginInfo)
      }
    })
    return result
  }

  async dealAdd(dirName, fileName) {
    if (this.pluginPkg.has(dirName) && !this.pkgFlag.includes(fileName)) return

    if (PATH.dirname(dirName) === this.bin && fileName) return

    this.sendLog('插件管理器', this.loadReady ? '新增插件' : '载入插件', ...arguments)

    let key = `${dirName}/${fileName}/`

    const stateMap = {
      '.js': '启用',
      '.bak': '停用'
    }
    const origin = (fileName.match(/^\[.*?\]/) || [this.defGroup])[0].replace(/^\[|\]$/g, '')
    const pluginInfo = {
      type: PATH.extname(fileName).replace('.', '') || '???',
      file: fileName,
      key: fileName.replace(/^\[.*?\]|.js(.bak)?$/g, ''),
      group: dirName,
      Abpath: PATH.resolve(this.dir, dirName, fileName),
      name: '???',
      dsc: '???',
      state: (dirName === this.bin ? '已删除' : stateMap[PATH.extname(fileName)] || '???'),
      origin: origin,
      imports: []
    }

    try {
      //ps:插件包先咕一下
      if (this.pkgFlag.includes(fileName)) return true

      const code = await fs.promises.readFile(PATH.join(this.dir, dirName, fileName), 'utf8')

      const esTree = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
      })

      esTree.body.forEach(nodeRoot => {
        if (nodeRoot.type === 'ImportDeclaration') {
          pluginInfo.imports.push(nodeRoot.source.value || '')
        }
        //导出了一个东西
        if (nodeRoot.type === 'ExportNamedDeclaration') {
          //导出的不是class(这个导出应该不会加载)
          if (nodeRoot.declaration.type !== 'ClassDeclaration') return
          //没有继承的class(还有高手？)
          if (!nodeRoot.declaration.superClass) return
          const classBody = nodeRoot.declaration.body
          //构造函数
          const constructorFnc = classBody.body.find(method => method.type === 'MethodDefinition' && method.kind === 'constructor')
          if (!constructorFnc) return
          //构造函数代码块
          const constructorBlock = constructorFnc.value.body
          //super函数
          const superFnc = constructorBlock.body.find(express => express.type === 'ExpressionStatement' && express.expression.type === 'CallExpression' && express.expression.callee?.type === 'Super')
          if (!superFnc) return
          //传入super函数的data
          const superData = superFnc.expression.arguments[0]
          //传入的第一参数不是对象
          if (superData?.type !== 'ObjectExpression') return
          superData.properties.forEach(item => {
            if (item.type !== 'Property') return
            if (item.key?.name === 'name') pluginInfo.name = item.value?.value || '???'
            if (item.key?.name === 'dsc') pluginInfo.dsc = item.value?.value || '???'
            //还能解出来其他东西，但用不上
          })
        }
      })
    } catch (err) {
      logger.error(`[插件管理器]加载插件< ${key} >错误:`, err)
    }
    this.plugins.set(key, pluginInfo)
  }

  async dealUnlink(dirName, fileName) {
    if (this.pluginPkg.has(dirName) && this.pkgFlag.includes(fileName)) this.pluginPkg.delete(dirName)

    this.sendLog('插件管理器', '卸载插件', ...arguments)

    let key = `${dirName}/${fileName}/`

    this.plugins.delete(key)
  }

  async dealChange(dirName, fileName) {
    if (this.pluginPkg.has(dirName) && !this.pkgFlag.includes(fileName)) return

    if (PATH.dirname(dirName) === this.bin && fileName) return

    this.sendLog('插件管理器', '修改插件', ...arguments)

    let key = `${dirName}/${fileName}/`

    this.plugins.delete(key)

    const stateMap = {
      '.js': '启用',
      '.bak': '停用'
    }
    const origin = (fileName.match(/^\[.*?\]/) || [this.defGroup])[0].replace(/^\[|\]$/g, '')
    const pluginInfo = {
      type: PATH.extname(fileName).replace('.', '') || '???',
      file: fileName,
      key: PATH.basename(fileName),
      group: dirName,
      Abpath: PATH.resolve(this.dir, dirName, fileName),
      name: '???',
      dsc: '???',
      state: (dirName === this.bin ? '已删除' : stateMap[PATH.extname(fileName)] || '???'),
      origin: origin,
      imports: []
    }

    try {
      //ps:插件包先咕一下
      if (this.pkgFlag.includes(fileName)) return true

      const code = await fs.promises.readFile(PATH.join(this.dir, dirName, fileName), 'utf8')

      const esTree = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
      })

      esTree.body.forEach(nodeRoot => {
        if (nodeRoot.type === 'ImportDeclaration') {
          pluginInfo.imports.push(nodeRoot.source.value || '')
        }
        //导出了一个东西
        if (nodeRoot.type === 'ExportNamedDeclaration') {
          //导出的不是class(这个导出应该不会加载)
          if (nodeRoot.declaration.type !== 'ClassDeclaration') return
          //没有继承的class(还有高手？)
          if (!nodeRoot.declaration.superClass) return
          const classBody = nodeRoot.declaration.body
          //构造函数
          const constructorFnc = classBody.body.find(method => method.type === 'MethodDefinition' && method.kind === 'constructor')
          if (!constructorFnc) return
          //构造函数代码块
          const constructorBlock = constructorFnc.value.body
          //super函数
          const superFnc = constructorBlock.body.find(express => express.type === 'ExpressionStatement' && express.expression.type === 'CallExpression' && express.expression.callee?.type === 'Super')
          if (!superFnc) return
          //传入super函数的data
          const superData = superFnc.expression.arguments[0]
          //传入的第一参数不是对象
          if (superData?.type !== 'ObjectExpression') return
          superData.properties.forEach(item => {
            if (item.type !== 'Property') return
            if (item.key?.name === 'name') pluginInfo.name = item.value?.value || '???'
            if (item.key?.name === 'dsc') pluginInfo.dsc = item.value?.value || '???'
            //还能解出来其他东西，但用不上
          })
        }
      })
    } catch (err) {
      logger.error('[插件管理器]加载插件错误:', err)
    }
    this.plugins.set(key, pluginInfo)
  }

  async dealAddDir(dirName, fileName) {
    if (dirName) return;
    if (this.pkgFlag.find(name => fs.existsSync(PATH.join(this.dir, fileName, name)))) this.pluginPkg.add(fileName)
    this.sendLog('插件管理器', this.loadReady ? '新增插件包' : '载入插件包', ...arguments)
  }

  async dealUnlinkDir(dirName, fileName) {
    if (dirName) return;
    this.pluginPkg.delete(fileName)
    this.sendLog('插件管理器', '删除插件包', ...arguments)
  }

  /**
   * 发送日志
   * @param  {...any} arg 要拼接的字符数组
   */
  sendLog(...arg) {
    const msg = lodash.compact(arg).map(val => `[${val}]`).join('')
    logger[this.loadReady ? 'info' : 'debug'](msg)
  }
}

export default new pluginLoader()