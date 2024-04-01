import plugin from '../../../lib/plugins/plugin.js'
import loader from '../../../lib/plugins/loader.js'
import com from '../../../lib/common/common.js'
import common from "../module/common.js"
import lodash from "lodash"

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
                    reg: '^#测试命令(.*)$',
                    fnc: 'testrule'
                }
            ]
        })
    }

    async getrule(e) {
        if (!common.auth(e)) return true;
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
            msgs[i] = await com.makeForwardMsg(e, msgs[i], `第${Number(i) + 1}页`);
            await e.reply(msgs[i]);
        }
        return true;
    }

    async testrule(e) {
        if (!common.auth(e)) return true;
        let key = e.msg.replace("#测试命令", "");
        let msgs = [`命令<${key}>响应插件`]
        for (let plugin of loader.priority) {
            let p = new plugin.class(e);
            if (lodash.isEmpty(p.rule)) continue;
            let msg = ''
            for (let v of p.rule) {
                if (new RegExp(v.reg).test(key)) {
                    msg += `插件：${plugin.name}\n路径：${plugin.key}\n优先级：${plugin.priority}\n`
                    msg += `命令正则：${v.reg}\n执行方法：${v.fnc}`
                }
            }
            if (msg) msgs.push(msg);
        }
        msgs = await com.makeForwardMsg(e, msgs);
        await e.reply(msgs);
        return true;
    }
}