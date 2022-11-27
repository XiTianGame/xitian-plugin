import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
import ConfigSet from "../module/ConfigSet.js";
import search from '../module/search.js';
import common from "../module/common.js"


export class PluginList extends plugin {
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
		this.Plugins = ConfigSet.getConfig("group", "set");//放这里是为了刷新
	}

	async read(e) {
		if (!common.auth(e)) {
			return true;
		}
		// 同步读取example目录下的所有文件
		let msg = [{
			message: "====插件列表====",
			nickname: Bot.nickname,
			user_id: cfg.qq,
		}];
		for (let group of this.Plugins.group) {
			const files = (await search.read()).get(group);
			let msg1 = [],msg2 = [],msg3 = [];
			files.forEach(file=>{
				if(file.endsWith(".js")){
					msg1.push(file.replace(/.js/g, ""))
				}else if(file.endsWith(".js.bak")){
					msg2.push(file.replace(/.js.bak/g, ""))
				}else{
					msg3.push(file)
				}
			})
			msg1 = msg1.join("\n")
			msg2 = msg2.join("\n")
			msg3 = msg3.join("\n")
			msg.push({
				message: `位于<${group.replace(/plugins|\//g, "")}>分组下的插件\n已启用的插件：\n\n${msg1}\n\n已停用的插件：\n\n${msg2}\n\n未知文件：\n\n${msg3}`,
				nickname: Bot.nickname,
				user_id: cfg.qq,
			});
		}
		//组装合并消息
		if (e.isGroup) {
			msg = await e.group.makeForwardMsg(msg)
		} else {
			msg = await e.friend.makeForwardMsg(msg)
		}
		e.reply(msg);
		return true;
	}

	async look(e) {
		if (!common.auth(e)) {
			return true;
		}
		// 同步读取bin目录下的所有文件
		const files = (await search.read()).get(this.Plugins.bin);
		let msg = []
		files.map(file => {
			msg.push(file.replace(/.js.bak|\[.*?\]/g, ""))
		});
		msg = msg.join("\n")
		e.reply(`回收站的插件：\n\n${msg}\n恢复请用：#恢复插件+名字`);
		return true;
	}
}