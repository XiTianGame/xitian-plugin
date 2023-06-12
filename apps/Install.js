import plugin from '../../../lib/plugins/plugin.js'
import ConfigSet from "../module/ConfigSet.js"
import install from "../module/install.js"
import common from "../module/common.js"
import PATH from "path"
import fs from 'fs';

let config = ConfigSet.getConfig("js", "set");
let plugins = ConfigSet.getConfig("group", "set");

const state = {};

export class Install extends plugin {
	constructor() {
		super({
			name: '插件安装',
			dsc: '进行安装和新增插件操作',
			/** https://oicqjs.github.io/oicq/#events */
			event: 'message',
			priority: 5,
			rule: [
				{
					reg: '^#(安装|新增|增加)插件(https:\/\/(github|gitee).com\/[a-zA-Z0-9-]{1,39}\/[a-zA-Z0-9_-]{1,100}(.git)?)?$',
					fnc: 'New'
				},
				{
					reg: '^#取消安装(插件)?$',
					fnc: 'cancel'
				},
				{
					reg: '^#(开始|结束)批量安装插件$',
					fnc: 'batch'
				},
				{
					reg: '(.*)',
					fnc: 'install',
					log: false
				},
				{
					reg: '^#清空回收站',
					fnc: 'clear'
				}
			]
		})
	}
	//安装指令
	async New(e) {
		if (!common.auth(e)) {
			return true;
		}
		//判断是否包含git链接
		let url = e.msg.replace(/#|安装|新增|增加|插件/g, "");
		if (url) {
			return await install.clone(url, e);
		}
		//是否包含文件
		if (!e.file) {
			state.type = 1
			e.reply([segment.at(e.user_id), "请发送js插件"]);
			return true;
		}

		return this.install();//消息包含js文件，直接安装
	}

	async cancel(e) {
		if (!common.auth(e)) {
			return true;
		}
		if(state.type) {
			state.type = 0;
			e.reply('安装已取消')
		}else {
			e.reply('当前未处于等待插件状态')
		}
		return true
	}

	async batch(e) {
		if (!common.auth(e)) {
			return true;
		}
		let keyword = e.msg.replace(/#|批量安装插件/g, "");

		if (keyword == "开始") {
			state.type = 2
			if (!e.file) {
				state.time = setTimeout(() => {
					e.reply("超过" + config.timeout + "秒未发送文件，安装已取消")
				}, config.timeout * 1000)
				e.reply([segment.at(e.user_id), "请发送js插件"]);
				return true;
			}

			return this.install();
		}

		if (keyword == "结束") {
			if (state.time) clearTimeout(state.time)
			state.type = 0
			e.reply("批量安装已结束~")
			return true;
		}
	}

	async install(e) {
		if (!state.type) return false;
		if (!common.auth(e)) {
			return false;
		}

		if (e.raw_message.includes("请发送js插件") || e.raw_message.includes("发送的不是js插件呢")) {
			return false;
		}

		if (!e.file || !e.file.name.endsWith(".js")) {
			e.reply([segment.at(e.user_id), '请发送js文件'])
			return true;
		}

		if (e.message[0].size > config.maxSize) {
			e.reply("文件过大，已取消本次安装");
			return true;
		}

		if (state.type == 1) {
			state.type = 0
		} else if (state.type == 2) {
			clearTimeout(state.time);
			state.time = setTimeout(() => {
				e.reply("超过" + config.timeout + "秒未发送文件，安装已取消")
				state.type = 0
			}, config.timeout * 1000)
		}

		let textPath = ConfigSet.group(config.default_group);
		//获取下载链接
		let fileUrl = await this.e[this.e.isGroup ? 'group' : 'friend'].getFileUrl(this.e.file.fid);
		let filename = this.e.file.name;
		if (config.auto_rename) {
			filename = await common.rename(filename);//重新命名插件
		}
		await install.install(fileUrl, textPath, filename, this.e.user_id);//调用安装函数
		return true;
	}

	async clear(e) {
		if (!common.auth(e)) {
			return true;
		}
		e.reply("警告！此操作会清空回收站内的全部插件,是否继续（是/否）")
		this.setContext('delete', e.isGroup, config.timeout)
		return true;
	}

	async delete(e) {
		switch (this.e.msg) {
			case '是':
				let files = fs.readdirSync(plugins.bin);
				files.forEach(item => {
					//rm暴力删除
					fs.rmSync(PATH.join(plugins.bin, item), { recursive: true, force: true })
				});
				this.e.reply("插件回收站已清空")
				this.finish('delete', this.e.isGroup)
				break;
			case '否':
				this.e.reply("操作已取消")
				this.finish('delete', this.e.isGroup);
				break;
			default:
				this.e.reply("请发送（是/否）进行选择")
				return false;
		}
		return false;
	}
}