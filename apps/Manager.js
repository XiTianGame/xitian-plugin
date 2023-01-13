import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
import ConfigSet from "../module/ConfigSet.js";
import uninstall from '../module/uninstall.js';
import search from "../module/search.js";
import common from "../module/common.js"
import fs from 'fs';

let config = ConfigSet.getConfig("js","set");
let plugins = ConfigSet.getConfig("group","set");

let default_num = plugins.group.indexOf(`plugins/${config.default_group}/`);

//不存在目录则创建目录
if (!fs.existsSync(plugins.bin)) {
	fs.mkdirSync(plugins.bin);
}
for (let item of plugins.group) {
	if (!fs.existsSync(item)) {
		fs.mkdirSync(item);
	}
}

export class Manager extends plugin {
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
					reg: '^#插件(.*)重命名(.*)$',
					fnc: 'rename'
				},
				{
					reg: '^#查看插件(.*)$',
					fnc: 'upload'
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
		if (plugininfo.length == 0) {//没找到插件
			e.reply("没有找到该插件，请确认你是否安装了该插件")
		} else if (plugininfo.length == 1) {//找到一个插件
			let msg = [
				`找到插件：${plugininfo[0].file.replace(/.js|.bak|\[.*?\]/g, "")}\n`,
				`位于分组：${plugininfo[0].path.replace(/plugins|\//g, "")}\n`,
				`当前状态：${plugininfo[0].state}`
			]
			e.reply(msg)
		} else if (plugininfo.length > 1) {//找到多个插件
			let msg = [];
			e.reply("找到多个插件")
			for (let item of plugininfo) {
				let info = [
					`找到插件：${item.file.replace(/.js|.bak|\[.*?\]/g, "")}\n`,
					`位于分组：${item.path.replace(/plugins|\//g, "")}\n`,
					`当前状态：${item.state}`
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
			await e.reply(msg)
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
		if (tmp.length == 0) {
			e.reply("没有找到该插件哦");
		} else if (tmp.length == 1) {
			if (tmp[0].state == "启用") {
				let path = `${tmp[0].path}${msg}.js`
				if (!fs.existsSync(path)) {
					e.reply("停用失败了呢~" + `\n有没有可能你没有安装“${msg}”插件`)
					return true;
				}
				fs.renameSync(`${tmp[0].path}${tmp[0].file}`, `${tmp[0].path}${msg}.js.bak`);
				e.reply(`已停用：${msg}` + "\n重启后生效呢~")
			} else if (tmp[0].state == "停用") {
				e.reply("该插件已经处于停用状态哦");
			} else if (tmp[0].state == "已删除") {
				e.reply("该插件处于已删除状态\n请先恢复插件哦");
			} else {
				e.reply("该插件状态异常,请确认你指定了有效的插件");
			}
		} else if (tmp.length > 1) {
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
		if (tmp.length == 0) {
			e.reply("没有找到该插件哦");
		} else if (tmp.length == 1) {
			if (tmp[0].state == "启用") {
				e.reply("该插件已经处于启用状态哦");
			} else if (tmp[0].state == "停用") {
				let path = `${tmp[0].path}${msg}.js.bak`
				if (!fs.existsSync(path)) {
					e.reply("启用失败了呢~" + `\n有没有可能你没有“${msg}”插件`)
					return true;
				}
				fs.renameSync(`${tmp[0].path}${tmp[0].file}`, `${tmp[0].path}${msg}.js`)
				e.reply(`已启用：${msg}` + "\n重启后生效呢~")
			} else if (tmp[0].state == "已删除") {
				e.reply("该插件处于已删除状态\n请先恢复插件哦");
			} else {
				e.reply("该插件状态异常,请确认你指定了有效的插件");
			}
		} else if (tmp.length > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async del(e) {
		if (!common.auth(e)) {
			return true;
		}
		let msg = e.msg.replace("#", "")
		//检查是否是大型插件
		if (await uninstall.removePlugin(e)) return true;

		//彻底删除，直接删除该文件
		if (msg.startsWith("彻底")) {
			this.setContext("fullDel",e.isGroup,60);
			await e.reply("(是|否)确认删除该插件？彻底删除后再也找不回来了哦");
			return true
		} else {
			msg = msg.replace("删除插件", "")
		}

		//删除插件，移动到回收站
		let tmp = await search.find(msg, 1);
		let path;
		if (tmp.length == 0) {
			e.reply("没有找到该插件哦");
		} else if (tmp.length == 1) {
			if (tmp[0].state == "启用") {
				path = `${tmp[0].path}${msg}.js`
			} else if (tmp[0].state == "停用") {
				path = `${tmp[0].path}${msg}.js.bak`
			} else if (tmp[0].state == "已删除") {
				e.reply("该插件已经是删除状态哦");
				return true;
			} else {
				e.reply("该插件状态异常,请确认你指定了有效的插件");
				return true;
			}
			if (fs.existsSync(path)) {
				fs.renameSync(`${tmp[0].path}${tmp[0].file}`, `${plugins.bin}[${tmp[0].origin}]${msg}.js.bak`)
				e.reply(`已删除：${msg}` + "\n重启后生效呢~")
				return true;
			} else e.reply("删除失败了呢~" + `\n有没有可能你没有安装“${msg}”插件`)
		} else if (tmp.length > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async fullDel(e) {
		if(!this.e.msg) return true;
		switch(this.e.msg){
			case "是":
				this.finish("fullDel",this.e.isGroup)
				let msg = e.msg.replace("#彻底删除插件", "")
				let tmp = await search.find(msg, 1);
				switch(tmp.length){
					case 0:
						e.reply("没有找到该插件哦");
						break;
					case 1:
						if (fs.existsSync(`${tmp[0].path}${tmp[0].file}`)) {
			                fs.unlinkSync(`${tmp[0].path}${tmp[0].file}`);
			                this.e.reply(`插件“${msg}”已经彻底删除，再也找不回来了哦~`)
			                return true
		                }
						break;
					default:
						e.reply("找到多个插件，请指定准确的插件名哦");
				}
				break;
			case "否":
				this.finish("fullDel",this.e.isGroup)
				this.e.reply("删除已取消")
				break;
			default:
				this.e.reply("请回答 是/否 来进行操作")
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
		if (tmp.length == 0) {
			e.reply("没有找到该插件哦");
			return true
		} else if (tmp.length == 1) {
			if (tmp[0].state == "启用") {
				e.reply("该插件处于启用状态哦")
			} else if (tmp[0].state == "停用") {
				e.reply("该插件处于停用状态哦")
			} else {
				let origin = tmp[0].file.replace(/.js|.bak|\[/g, "").split("]");
				let path
				if (origin.length > 1) {
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
		} else if (tmp.length > 1) {
			e.reply("找到多个插件，请指定准确的插件名哦");
		}
		return true;
	}

	async rename(e) {
		if (!common.auth(e)) {
			return true;
		}

		let key = e.msg.replace("#插件", "").split("重命名");
		if (key.length > 2) {
			for (let num = 2; num < key.length; num++) {
				key[1] = key[1] + "重命名" + key[num];
			}
		}
		let tmp = await search.find(key[0], 1);
		switch (tmp.length) {
			case 0:
				e.reply("未找到该插件")
				break;
			case 1:
				fs.renameSync(`${tmp[0].path}${tmp[0].file}`, `${tmp[0].path}${key[1]}.js`);
				e.reply(`插件“${key[0]}”重命名成功`)
				break;
			default:
				e.reply("找到多个插件，请指定准确的插件名哦")
		}
		return true;
	}

	async upload(e) {
		if (!common.auth(e)) {
			return true;
		}

		let key = e.msg.replace("#查看插件", "");
		let tmp = await search.find(key, 1);
		switch (tmp.length) {
			case 0:
				e.reply("未找到该插件")
				break;
			case 1:
				if (e.isGroup) {
					//上传到群文件
					Bot.pickGroup(e.group_id).fs.upload(`${tmp.pluginPath}/${tmp.pluginname}`);
				} else {
					//发送离线文件
					Bot.pickFriend(e.user_id).sendFile(`${tmp.pluginPath}/${tmp.pluginname}`);
				}
				break;
			default:
				e.reply("找到多个插件，请指定准确的插件名哦")
		}
		return true;
	}
}