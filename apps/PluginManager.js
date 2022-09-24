import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
import ConfigSet from "../module/ConfigSet.js";
import search from "../module/search.js";
import common from "../module/common.js"
import fs from 'fs';

const _path = process.cwd();//云崽目录

let config = ConfigSet.getConfig("js","set");
let plugins = ConfigSet.getConfig("group","set");

let default_num = plugins.group.indexOf(`plugins/${config.default_group}/`);

//不存在目录则创建目录
if (!fs.existsSync(plugins.bin)) {
	fs.mkdirSync(plugins.bin);
}
for (let tmp = 0; tmp < plugins.group.length; tmp++) {
	if (!fs.existsSync(plugins.group[tmp])) {
		fs.mkdirSync(plugins.group[tmp]);
	}
}

export class PluginManager extends plugin {
	constructor() {
		super({
			name: '插件管理',
			dsc: '各种功能帮助master管理js插件',
			/** https://oicqjs.github.io/oicq/#events */
			event: 'message',
			priority: 5,
			rule: [
				{
					reg: '^#查找插件(.*)$',
					fnc: 'find'
				},
				{
					reg: '^#停用插件(.*)$',
					fnc: 'mv_ty'
				},
				{
					reg: '^#启用插件(.*)$',
					fnc: 'mv_qy'
				},
				{
					reg: '^#(彻底)?删除插件(.*)$',
					fnc: 'del'
				},
				{
					reg: '^#恢复插件(.*)$',
					fnc: 'rec'
				},
				{
					reg: '^#插件(.*)重命名(.*)',
					fnc: 'rename'
				}
			]
		})
	}

	async find(e) {
		if (!common.auth(e)) {
			return true;
		}
		//获取关键字
		let keyword = e.msg.replace(/#查找插件|.js|.bak/g, "")
		let plugininfo = await search.find(keyword, 0)
		if (plugininfo.number == 0) {//没找到插件
			e.reply("没有找到该插件，请确认你是否安装了该插件")
		} else if (plugininfo.number == 1) {//找到一个插件
			let msg = [
				`找到插件：${plugininfo.pluginname[0].replace(/.js|.bak|\[.*?\]/g, "")}\n`,
				`位于分组：${plugininfo.pluginPath[0].replace(/plugins|\//g, "")}\n`,
				`当前状态：${plugininfo.pluginState[0]}`
			]
			e.reply(msg)
		} else if (plugininfo.number > 1) {//找到多个插件
			let num, msg = [];
			e.reply("找到多个插件")
			for (num = 0; num < plugininfo.number; num++) {
				let info = [
					`找到插件：${plugininfo.pluginname[num].replace(/.js|.bak|\[.*?\]/g, "")}\n`,
					`位于分组：${plugininfo.pluginPath[num].replace(/plugins|\//g, "")}\n`,
					`当前状态：${plugininfo.pluginState[num]}`
				]
				msg.push({
					message: info,
					nickname: Bot.nickname,
					user_id: cfg.qq,
				});
			}
			//判断是不是群聊，制作合并转发消息
			if (e.isGroup) {
				msg = await e.group.makeForwardMsg(msg)
			} else {
				msg = await e.friend.makeForwardMsg(msg)
			}
			e.reply(msg)
		}
		return true;
	}

	async mv_ty(e) {
		if (!common.auth(e)) {
			return true;
		}

		// 停用插件，添加.bak的后缀名

		let msg = e.msg.replace("#停用插件", "")
		let tmp = await search.find(msg, 1);
		if (tmp.number == 0) {
			e.reply("没有找到该插件哦");
			return true;
		} else if (tmp.number == 1) {
			if (tmp.pluginState == "启用") {
				let path = `${tmp.pluginPath[0]}${msg}.js`
				if (!fs.existsSync(path)) {
					e.reply("停用失败了呢~" + `\n有没有可能你没有安装“${msg}”插件`)
					return true;
				}
				fs.renameSync(`${tmp.pluginPath[0]}${tmp.pluginname[0]}`, `${tmp.pluginPath[0]}${msg}.js.bak`);
				e.reply(`已停用：${msg}` + "\n重启后生效呢~")
			} else if (tmp.pluginState == "停用") {
				e.reply("该插件已经处于停用状态哦");
				return true;
			} else {
				e.reply("该插件处于已删除状态\n请先恢复插件哦");
				return true;
			}
		} else if (tmp.number > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async mv_qy(e) {
		if (!common.auth(e)) {
			return true;
		}

		// 启用插件，去除.bak的后缀名

		let msg = e.msg.replace("#启用插件", "")
		let tmp = await search.find(msg, 1);
		if (tmp.number == 0) {
			e.reply("没有找到该插件哦");
			return true;
		} else if (tmp.number == 1) {
			if (tmp.pluginState == "启用") {
				e.reply("该插件已经处于启用状态哦");
				return true;
			} else if (tmp.pluginState == "停用") {
				let path = `${tmp.pluginPath[0]}${msg}.js.bak`
				if (!fs.existsSync(path)) {
					e.reply("启用失败了呢~" + `\n有没有可能你没有“${msg}”插件`)
					return true;
				}
				fs.renameSync(`${tmp.pluginPath[0]}${tmp.pluginname[0]}`, `${tmp.pluginPath[0]}${msg}.js`)
				e.reply(`已启用：${msg}` + "\n重启后生效呢~")
			} else {
				e.reply("该插件处于已删除状态\n请先恢复插件哦");
				return true;
			}
		} else if (tmp.number > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async del(e) {
		if (!common.auth(e)) {
			return true;
		}

		// 彻底删除，直接删除该文件

		let msg = e.msg.replace("#", "")
		if(msg.startsWith("彻底")){
			msg = msg.replace("彻底删除插件","")
			let tmp = await search.find(msg, 1);
			if(fs.existsSync(`${tmp.pluginPath}${tmp.pluginname}`)){
				fs.unlink(`${tmp.pluginPath}${tmp.pluginname}`,( )=>{});
				e.reply(`插件“${msg}”已经彻底删除，再也找不回来了哦~`)
				return true
			}
		}else{
			msg = msg.replace("删除插件","")
		}
		//删除插件，移动到回收站
		let tmp = await search.find(msg, 1);
		let path;
		if (tmp.number == 0) {
			e.reply("没有找到该插件哦");
			return true
		} else if (tmp.number == 1) {
			if (tmp.pluginState[0] == "启用") {
				path = `${tmp.pluginPath[0]}${msg}.js`
			} else if (tmp.pluginState[0] == "停用") {
				path = `${tmp.pluginPath[0]}${msg}.js.bak`
			} else {
				e.reply("该插件已经是删除状态哦");
				return true;
			}
			if (fs.existsSync(path)) {
				fs.renameSync(`${tmp.pluginPath[0]}${tmp.pluginname[0]}`, `${plugins.bin}[${tmp.pluginPath[0].replace(/plugins|\//g, "")}]${msg}.js.bak`)
				e.reply(`已删除：${msg}` + "\n重启后生效呢~")
				return true;
			} else e.reply("删除失败了呢~" + `\n有没有可能你没有安装“${msg}”插件`)
		} else if (tmp.number > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async rec(e) {
		if (!common.auth(e)) {
			return true;
		}

		// 恢复插件，去除.bak的后缀名

		let msg = e.msg.replace("#恢复插件", "")
		let tmp = await search.find(msg, 1);
		//确定来源文件夹
		if (tmp.number == 0) {
			e.reply("没有找到该插件哦");
			return true
		} else if (tmp.number == 1) {
			if (tmp.pluginState[0] == "启用") {
				e.reply("该插件处于启用状态哦")
			} else if (tmp.pluginState[0] == "停用") {
				e.reply("该插件处于停用状态哦")
			} else {
				let origin = tmp.pluginname[0].replace(/.js|.bak|\[/g, "").split("]");
				let path
				if (origin[1]) {
					path = `${plugins.bin}[${origin[0]}]${msg}.js.bak`
					if (!fs.existsSync(path)) {
						e.reply("恢复失败了呢~" + `\n有没有可能你没有“${msg}”插件`)
						return true;
					}
					//先确定有没有这个分组
					if (!fs.existsSync(`plugins/${origin[0]}`)) {
						e.reply(`有没有可能你没有${origin[0]}分组\n即将恢复至默认分组`)
						fs.renameSync(`${plugins.bin}[${origin[0]}]${msg}.js.bak`, `plugins/${plugins.group[default_num]}/${msg}.js`)
					} else {
						fs.renameSync(`${plugins.bin}[${origin[0]}]${msg}.js.bak`, `plugins/${origin[0]}/${msg}.js`)
					}
				} else {
					path = `${plugins.bin}${msg}.js.bak`
					if (!fs.existsSync(path)) {
						e.reply("恢复失败了呢~" + `\n有没有可能你没有“${msg}”插件`)
						return true;
					}
					fs.renameSync(`${plugins.bin}${msg}.js.bak`, `${plugins.group[default_num]}${msg}.js`)
				}
				e.reply(`已恢复：${msg}` + "\n重启后生效呢~")
			}
		} else if (tmp.number > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async rename(e) {
		let key = e.msg.replace("#插件", "").split("重命名");
		if (key.length > 2) {
			for (let num = 2; num < key.length; num++) {
				key[1] = key[1] + "重命名" + key[num];
			}
		}
		let tmp = await search.find(key[0], 1);
		switch (tmp.number) {
			case 0:
				e.reply("未找到该插件")
				break;
			case 1:
				fs.renameSync(`${tmp.pluginPath[0]}${tmp.pluginname[0]}`, `${tmp.pluginPath[0]}${key[1]}.js`);
				e.reply(`插件“${key[0]}”重命名成功`)
				break;
			default:
				e.reply("找到多个插件，请指定准确的插件名哦")
				return true;
		}
	}
}