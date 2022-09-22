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
	}

	async read(e) {
		if (!common.auth(e)) {
			return true;
		}
		let plugins = ConfigSet.getConfig("group", "set");//放这里是为了刷新
		// 同步读取example目录下的所有文件
		let msg = [{
			message: "====插件列表====",
			nickname: Bot.nickname,
			user_id: cfg.qq,
		}];
		for (let num in plugins.group) {
			const files = (await search.read()).plugins;
			let msg1 = files[num].map(file => {
				if (file.endsWith(".js"))
					return ` \n${file.replace(/.js/g, "")}`;
			});
			let msg2 = files[num].map(file => {
				if (file.endsWith(".js.bak"))
					return ` \n${file.replace(/.js.bak/g, "")}`;
			});
			let msg3 = files[num].map(file => {
				if (!file.endsWith(".js")&&!file.endsWith(".js.bak"))
					return file;
			});
			msg1 = msg1.join(",").replace(/,/g, "");
			msg2 = msg2.join(",").replace(/,/g, "");
			msg3 = msg3.join(",").replace(/,/g, "");
			msg.push({
				message: `位于${plugins.group[num].replace(/plugins|\//g, "")}分组下的插件\n已启用的插件：\n${msg1}\n\n已停用的插件：\n${msg2}\n\n未知文件：\n${msg3}`,
				nickname: Bot.nickname,
				user_id: cfg.qq,
			});
		}
		//组装合并消息
		if (this.e.isGroup) {
			msg = await this.e.group.makeForwardMsg(msg)
		} else {
			msg = await this.e.friend.makeForwardMsg(msg)
		}
		e.reply(msg);
		return true;
	}

	async look(e) {
		if (!common.auth(e)) {
			return true;
		}
		// 同步读取bin目录下的所有文件
		const files = (await search.read()).bin;
		let msg = files.map(file => {
			return ` \n${file.replace(/.js.bak|\[.*?\]/g, "")}`;
		});
		msg = msg.join(",").replace(/,/g, "");
		e.reply(`回收站的插件：\n${msg}\n恢复请用：#恢复插件+名字`);
		return true;
	}
}