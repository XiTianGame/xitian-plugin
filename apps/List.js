import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
import ConfigSet from "../module/ConfigSet.js"
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import list from '../module/list.js'
import search from '../module/search.js'
import common from "../module/common.js"


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
		this.Plugins = ConfigSet.getConfig("group", "set");//放这里是为了刷新
	}

	async read(e) {
		if (!common.auth(e)) {
			return true;
		}
		const data = await new list(e).getData();

		let img = await puppeteer.screenshot("list", data);
		e.reply(img)
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
			msg.push(file.file.replace(/.js.bak|\[.*?\]/g, ""))
		});
		msg = msg.join("\n")
		e.reply(`回收站的插件：\n\n${msg}\n恢复请用：#恢复插件+名字`);
		return true;
	}
}