import plugin from '../../../lib/plugins/plugin.js'
import loader from '../../../lib/plugins/loader.js'
import common from '../../../lib/common/common.js'
import config from '../module/config.js'
import util from 'node:util'
import lodash from 'lodash'


export class regTest extends plugin {
  constructor() {
    super({
      name: '插件测试',
      dsc: '测试或查看全部命令',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#命令(总览|列表)$',
          fnc: 'getrule'
        },
        {
          reg: '^#测试(执行)?命令(.*)$',
          fnc: 'testrule'
        }
      ]
    })
  }

  async getrule(e) {
    if (!config.auth(e)) return true;
    let msgs = []
    for (let plugin of loader.priority) {
      let p = new plugin.class(e);
      let msg = `插件名：${plugin.name}\n路径：${plugin.key}\n优先级：${plugin.priority}\n`
      if (lodash.isEmpty(p.rule)) {
        msg += `无命令正则\n`
        msgs.push(msg);
        continue;
      }
      for (let v in p.rule) {
        msg += `命令正则<${Number(v) + 1}>：${p.rule[v].reg}\n`
      }
      msgs.push(msg)
    }
    msgs = lodash.chunk(msgs, 50);
    for (let i in msgs) {
      msgs[i] = await common.makeForwardMsg(e, msgs[i], `第${Number(i) + 1}页`)
      await e.reply(msgs[i])
    }
    return true;
  }

  async testrule(e) {
    if (!config.auth(e)) return true;
    let key = e.msg.replace('#测试', '').replace('命令', '')
    let execute = false
    if (key.startsWith('执行')) {
      key = key.replace('执行', '')
      execute = true
    }
    //替换执行指令
    e.msg = key
    e.message[0].text = key
    let msgs = [`命令<${key}>响应插件`]
    for (let plugin of loader.priority) {
      let p = new plugin.class(e)
      if (!this.filtEvent(e, p)) continue
      if (lodash.isEmpty(p.rule)) continue
      let msg = ''
      for (let v of p.rule) {
        if (v.event && !this.filtEvent(e, v)) continue
        if (new RegExp(v.reg).test(key)) {
          msg += `插件：${plugin.name}\n路径：${plugin.key}\n优先级：${plugin.priority}\n`
          msg += `命令正则：${v.reg}\n执行方法：${v.fnc}`
          if (execute) {
            try {
              let res = p[v.fnc] && p[v.fnc](e)
              if (util.types.isPromise(res)) res = await res
              msg += `\n返回结果：${util.format(res)}`
              if (res !== false) {
                msg += `\n该命令在此终止`
              }
            } catch (err) {
              msg += `\n执行报错：${err}\n该命令在此终止`
            }
          }
        }
      }
      if (msg) msgs.push(msg);
    }
    msgs = await common.makeForwardMsg(e, msgs)
    await e.reply(msgs)
    return true
  }

  /** 过滤事件 */
  filtEvent(e, v) {
    let event = v.event.split('.')
    let eventMap = {
      message: ['post_type', 'message_type', 'sub_type'],
      notice: ['post_type', 'notice_type', 'sub_type'],
      request: ['post_type', 'request_type', 'sub_type']
    }
    let newEvent = []
    event.forEach((val, index) => {
      if (val === '*') {
        newEvent.push(val)
      } else if (eventMap[e.post_type]) {
        newEvent.push(e[eventMap[e.post_type][index]])
      }
    })
    newEvent = newEvent.join('.')

    if (v.event == newEvent) return true

    return false
  }
}