import common from '../../../lib/common/common.js'
import { Restart } from '../../other/restart.js'
import { exec } from 'child_process'
import search from './loader.js'
import config from './config.js'
import fetch from 'node-fetch'
import * as acorn from 'acorn'
import path from 'node:path'
import fs from 'node:fs'

class install {
  get config() {
    return config.getConfig('js', 'set')
  }

  get groups() {
    return config.getConfig('group', 'set')
  }

  get char() {
    return config.getdefSet('char', 'set')
  }

  get lexicon() {
    return config.getdefSet('lexicon', 'set')
  }

  rename(oldName) {
    const ext = path.extname(oldName)
    oldName = oldName.replace(new RegExp(ext + '$'), '')
    for (let item of this.lexicon.key) {
      oldName = oldName.replace(new RegExp(item, 'g'), '');
    }
    return oldName + ext
  }

  /**
   * 选择安装文件夹
   * @param savePath 安装路径
   * @param sameplugin 查找的相似插件列表
   */
  choose(savePath, sameplugin) {
    //设置组名
    const changeGroup = (name) => {
      const baseDir = path.dirname(path.dirname(savePath))
      const saveName = path.basename(savePath)
      savePath = path.join(baseDir, name, saveName)
    }
    switch (sameplugin.length) {
      case 0:
        //默认路径
        break
      case 1:
        if (sameplugin[0].state !== '已删除') {
          changeGroup(sameplugin[0].path)
        }
        break
      default:
        for (let plugin of sameplugin) {
          if (plugin.state !== '已删除') {
            changeGroup(plugin.path)
          }
        }
        break
    }
    return savePath
  }

  /**
  * 进行插件安装
  * @param e 消息事件
  * @param fileUrl 文件下载链接
  * @param savePath 安装路径
  */
  async install(e, fileUrl, savePath) {
    if (this.config.auto_rename) {
      //重命名
      savePath = path.join(path.dirname(savePath), this.rename(path.basename(savePath, '.js')))
    }

    //智能安装
    if (this.config.auto_install) {
      let sameplugin = await search.find(path.basename(savePath, '.js'), 1);//提取插件关键名字
      savePath = this.choose(savePath, sameplugin);
      //下载文件
      //根据不同匹配数来运行不同安装操作
      switch (sameplugin.length) {
        case 0:
          if (!await common.downFile(fileUrl, savePath + '.bak')) {
            e.reply('安装插件错误：文件下载失败')
            return
          }
          //核验插件
          if (await this.check(e, savePath + '.bak')) {
            e.reply('此插件已安装，立即生效')
          }
          break;
        case 1:
          e.reply(`检测到相似插件:${sameplugin[0].key}，正在执行覆盖安装`)
          //根据插件不同的状态分类处理
          switch (sameplugin[0].state) {
            case '启用':
              fs.renameSync(sameplugin[0].Abpath, path.join(this.groups.bin, `${sameplugin[0].file}.bak`))
              break;
            case '停用':
              fs.renameSync(sameplugin[0].Abpath, path.join(this.groups.bin, sameplugin[0].file))
              break;
            default://回收站的不做处理
          }
          if (!await common.downFile(fileUrl, savePath + '.bak')) {
            e.reply('安装插件错误：文件下载失败')
            return
          }
          await common.sleep(200);//防止消息重叠
          //核验插件
          if (await this.check(e, savePath + '.bak')) {
            e.reply('此插件已覆盖安装，立即生效')
          }
          break;
        default:
          e.reply('检测到多个相似插件，正在进行处理...')
          for (let sameItem of sameplugin) {
            switch (sameItem.state) {
              case '启用':
                fs.renameSync(sameItem.Abpath, path.join(this.groups.bin, `${sameItem.file}.bak`))
                break;
              case '停用':
                fs.renameSync(sameItem.Abpath, path.join(this.groups.bin, sameItem.file))
                break;
              default://回收站的会直接删除
                fs.unlinkSync(sameItem.Abpath)
            }
          }
          if (!await common.downFile(fileUrl, savePath + '.bak')) {
            e.reply('安装插件错误：文件下载失败')
            return
          }
          await common.sleep(200);//防止消息重叠
          //核验插件
          if (await this.check(e, savePath + '.bak')) {
            e.reply('处理完成！此插件已覆盖安装，立即生效')
          }
      }
    } else {
      //没开启智能安装直接无脑覆盖
      //下载文件
      await common.downFile(fileUrl, savePath + '.bak')
      //核验插件
      //核验插件
      if (await this.check(e, savePath + '.bak')) {
        e.reply('此插件已安装，立即生效')
      }
    }
  }

  /**
   * 对插件进行核验
   * @param e 消息
   * @param {string} filepath 插件路径
   */
  async check(e, filepath) {
    if (!this.config.auto_check) {
      fs.renameSync(filepath, filepath.substring(0, filepath.length - 4));
      return true;
    }
    try {
      //读取插件
      const esTree = acorn.parse(fs.readFileSync(filepath, 'utf8'))
      //导出的东西
      const imports = []

      for (const nodeRoot of esTree.body) {
        if (nodeRoot.type === 'ImportDeclaration') {
          switch (nodeRoot.source.value) {
            case 'fs':
            case 'node:fs':
              imports.push('文件系统 - 可以执行文件操作')
              break
            case 'child_process':
            case 'node:child_process':
              imports.push('子进程 - 可以运行命令')
          }
        }
        //导出了一个东西
        if (nodeRoot.type === 'ExportNamedDeclaration') {
          //导出的不是class(这个导出应该不会加载，会报错)
          if (nodeRoot.declaration.type !== 'ClassDeclaration') {
            e.reply(`检测到非法导出类型：${nodeRoot.declaration.type}，插件管理器已将其停用`)
            return false
          }
        }
      }

      //去除.bak，启用该插件
      fs.renameSync(filepath, filepath.substring(0, filepath.length - 4))
      const msg = ['核验完成！该插件无问题']
      if (imports.length) msg.push('\n插件调用了以下敏感模块：\n' + imports.join('\n'))
      e.reply(msg)
      return true
    } catch (err) {
      e.reply(`插件读取出现问题！核验已终止。错误信息：$${err}`)
      fs.renameSync(filepath, filepath.substring(0, filepath.length - 4))
      return true
    }
  }

  /**
   * 安装github插件
   * @param url 插件地址
   * @param e 消息
   */
  async clone(e, url) {
    if (!url.endsWith('.git')) {
      url = url + '.git';
    }
    /**插件名 */
    let name = new URL(url).pathname.replace('/', '')
    e.reply(`开始安装：${name}`)

    /**检查链接和插件 */
    if (!await this.checkurl(url)) {
      e.reply(`安装失败！无法连接到目标仓库`)
      return true;
    }

    /**检查已安装情况 */
    if (fs.existsSync(path.join('./plugins', name))) {
      e.reply(`已经安装该插件，若该插件无法运行，可以尝试卸载后重装`)
      return true
    }

    /**检查git安装 */
    if (!await this.checkGit(e)) return true

    /**执行安装命令 */
    let command = `git clone ${url}`
    let result = await this.execSync(command, {cwd: path.join(process.cwd(), 'plugins')})

    if (result.error) {
      await e.reply(`安装${name}失败，错误信息：\n${result.error}`)
      return true
    }
    /**重启云崽 */
    await e.reply('安装成功！即将进行重启...')
    this.restart(e)
    return true
  }

  /**
   * 检查插件地址有效性
   * @param {string} url 插件地址
   */
  async checkurl(url) {
    //检查链接
    try {
      const response = await fetch(url)
      if (response.status !== 200) return false
      return true
    } catch (err) {
      return false
    }
  }

  /**
   * 检查git是否安装
   */
  async checkGit(e) {
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
  async execSync(cmd, options = {}) {
    return new Promise(resolve => {
      exec(cmd, { ...options, windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  /**
   * 重启云崽
   */
  restart(e) {
    new Restart(e).restart()
  }
}

export default new install()