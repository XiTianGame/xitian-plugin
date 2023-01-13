import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
import ConfigSet from "../module/ConfigSet.js"
import install from "../module/install.js"
import uninstall from "../module/uninstall.js"
import common from "../module/common.js"
import { segment } from "oicq";
import fs from 'fs';

const _path = process.cwd();//云崽目录

let config = ConfigSet.getConfig("js","set");
let plugins = ConfigSet.getConfig("group","set");

let default_num = plugins.group.indexOf(`plugins/${config.default_group}/`);

let my = {};
let confirm = {};

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
					reg: '^#(开始|结束)批量安装插件$',
					fnc: 'batch'
				},
				{
					reg: '(.*)',
					fnc: 'Msg',
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
			if (my[e.user_id]) {
				clearTimeout(my[e.user_id]);
			}
			my[e.user_id] = setTimeout(() => {
				if (my[e.user_id]) {
					delete my[e.user_id];
				}
				if (my["单次"]) {
					delete my["单次"]
				}
				e.reply("操作超时，请重新发送安装指令哦")
			}, config.timeout * 1000);//等待js文件
			my["单次"] = true;

			e.reply([segment.at(e.user_id), " 请发送js插件"]);
			return true;
		}

		my[e.user_id] = true;
		my["单次"] = true;

		return this.Msg(e);//消息包含js文件，直接安装
	}

	async batch(e) {
		if (!common.auth(e)) {
			return true;
		}
		let keyword = e.msg.replace(/#|批量安装插件/g, "");

		if (keyword == "开始") {

			if (!e.file) {
				if (my[e.user_id]) {
					clearTimeout(my[e.user_id]);
				}
				my[e.user_id] = setTimeout(() => {
					if (my[e.user_id]) {
						delete my[e.user_id];
					}
					if (my["批量"]) {
						delete my["批量"]
					}
					e.reply(`超过${config.timeout}秒未发送消息，批量安装已结束`)
				}, config.timeout * 1000);//等待js文件
				my["批量"] = true;
				e.reply([segment.at(e.user_id), " 请发送js插件"]);
				return true;
			}
			my[e.user_id] = true;
			my["批量"] = true;

			return this.Msg(e);
		}

		if (keyword == "结束") {
			cancel(e);
			e.reply("批量安装已结束~")
			return true;
		}
	}

	//消息发送监听
	async Msg(e) {
		//不是主人
		if (!common.auth(e)) {
			return false;
		}
		//不是发送安装的人
		if (!my[e.user_id] && !confirm[e.user_id]) {
			return false;
		}
		if (e.raw_message.includes("请发送js插件") || e.raw_message.includes("发送的不是js插件呢")) {
			return false;
		}
		//清空回收站的确认操作
		if (confirm[e.user_id]) {
			if (!e.msg) return false
			if (e.msg == "是") {
				//清空bin内的全部文件
				var files = fs.readdirSync(plugins.bin);
				files.forEach(item => {
					//如果是文件夹呢
					if (fs.statSync(`${plugins.bin}${item}`).isDirectory()) {
						uninstall.deleteFolder(`${plugins.bin}${item}`);
					} else {
						fs.unlink(`${plugins.bin}${item}`, () => { })
					}
				});
				cancel(e);
				e.reply("插件回收站已清空")
				return true;
			} else if (e.msg == "否") {
				cancel(e);
				e.reply("操作已取消")
				return true;
			}
			return false;
		}
		//不允许群聊安装插件
		if (e.isGroup) {
			e.reply("不允许群聊安装插件，安装已取消");
			cancel(e);
			return true;
		}
		//单个安装的操作
		if (my[e.user_id] && my["单次"]) {

			if (!e.file || !e.file.name.includes("js")) {
				e.reply([segment.at(e.user_id), '发送的不是js插件呢，安装已取消！'])
				cancel(e);
				return true;
			}

			if (e.message[0].size > config.maxSize) {
				cancel(e);
				e.reply("文件过大，已取消本次安装");
				return true;
			}

			let textPath = plugins.group[default_num];
			//获取下载链接
			let fileUrl = await e.friend.getFileUrl(e.file.fid);
			let filename = e.file.name;
			if (config.auto_rename) {
				filename = await common.rename(filename);//重新命名插件
			}
			await install.install(fileUrl, textPath, filename, e.user_id);//调用安装函数
			cancel(e);
			return true;
		}
		//批量安装的操作
		if (my[e.user_id] && my["批量"]) {

			if (!e.file || !e.file.name.includes("js")) {
				e.reply([segment.at(e.user_id), '发送的不是js插件呢'])
				return true;
			}

			if (e.message[0].size > config.maxSize) {
				e.reply("文件过大，无法安装该插件");
				return true;
			}
			//重置时间
			cancel(e);
			my[e.user_id] = setTimeout(() => {
				if (my[e.user_id]) {
					delete my[e.user_id];
				}
				if (my["批量"]) {
					delete my["批量"];
				}
				e.reply(`超过${config.timeout}秒未发送消息，批量安装已结束~`)
			}, config.timeout * 1000);//等待js文件

			let textPath = plugins.group[default_num];
			//获取下载链接
			let fileUrl = await e.friend.getFileUrl(e.file.fid);
			let filename = e.file.name;
			if (config.auto_rename) {
				filename = await common.rename(filename);//重新命名插件
			}
			await install.install(fileUrl, textPath, filename, e.user_id);//调用安装函数
			return true;
		}

		return false;//都没匹配就溜了
	}

	async clear(e) {
		if (!common.auth(e)) {
			return true;
		}
		if (confirm[e.user_id]) {
			clearTimeout(confirm[e.user_id]);
		}
		confirm[e.user_id] = setTimeout(() => {
			if (confirm[e.user_id]) {
				delete confirm[e.user_id];
			}
			e.reply("操作超时，已取消清空回收站指令")
		}, config.timeout * 1000);//等待操作指令
		e.reply("警告！此操作会清空回收站内的全部插件,是否继续（是/否）")
		return true;
	}
}

//取消操作
function cancel(e) {
	if (my[e.user_id]) {
		clearTimeout(my[e.user_id]);
		delete my[e.user_id];
	}
	if (confirm[e.user_id]) {
		clearTimeout(confirm[e.user_id]);
		delete confirm[e.user_id];
	}
	if (my["单次"]) {
		delete my["单次"];
	}
	if (my["批量"]) {
		delete my["批量"];
	}
}