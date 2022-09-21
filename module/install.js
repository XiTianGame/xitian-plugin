import cfg from '../../../lib/config/config.js'
import fs from 'fs';
import search from './search.js';
import ConfigSet from "./ConfigSet.js";
import common from "../../../lib/common/common.js";
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";



class install {
	constructor() {
		/** 获取配置 */
		this.config = ConfigSet.getConfig("js", "set");
		this.plugins = ConfigSet.getConfig("group", "set");
		this.default_num = this.plugins.group.indexOf(`plugins/${this.config.default_group}/`);
	}

	/**
	* 进行插件安装
	* @param fileUrl 文件下载链接
	* @param textPath 安装目录，需要带新插件名
	* @param filename 插件原本名字，用于检索相似插件
	* @param id 用于发送安装状态信息的用户id
	*/
	async install(fileUrl, textPath, filename, id = cfg.masterQQ[0]) {
		//智能安装
		if (this.config.auto_install && filename) {
			let sameplugin = await search.find(filename.replace(/v3|V3|\[.*?\]|\(.*?\)|\（.*?\）|\[.*?\]|\【.*?\】|\-|\_|[0-9]+/g, ""), 0);//提取插件关键名字
			//下载output_log.txt文件
			const response = await fetch(fileUrl);
			const streamPipeline = promisify(pipeline);
			//根据不同匹配数来运行不同安装操作
			switch (sameplugin.number) {
				case 0:
					await streamPipeline(response.body, fs.createWriteStream(textPath));
					Bot.pickFriend(id).sendMsg("此插件已安装，重启后生效~");
					break;
				case 1:
					Bot.pickFriend(id).sendMsg(`检测到相似插件:${sameplugin.pluginname[0].replace(/.js|.bak/g, "")}，正在执行覆盖安装`);
					//根据插件不同的状态分类处理
					switch (sameplugin.pluginState[0]) {
						case '启用':
							fs.renameSync(`${sameplugin.pluginPath[0]}${sameplugin.pluginname[0]}`, `${this.plugins.bin}${sameplugin.pluginname[0]}.bak`)
							break;
						case '停用':
							fs.renameSync(`${sameplugin.pluginPath[0]}${sameplugin.pluginname[0]}`, `${this.plugins.bin}${sameplugin.pluginname[0]}`)
							break;
						default://回收站的不做处理
					}
					await streamPipeline(response.body, fs.createWriteStream(textPath));

					await common.sleep(500);//防止消息重叠
					Bot.pickFriend(id).sendMsg("此插件已覆盖安装，重启后生效~");
					break;
				default:
					Bot.pickFriend(id).sendMsg("检测到多个相似插件，正在进行处理...");
					let num;//由于搜索逻辑，这里要从后往前排
					for (num = sameplugin.number - 1; num >= 0; num--) {
						switch (sameplugin.pluginState[num]) {
							case '启用':
								fs.renameSync(`${sameplugin.pluginPath[num]}${sameplugin.pluginname[num]}`, `${this.plugins.bin}${sameplugin.pluginname[num]}.bak`)
								break;
							case '停用':
								fs.renameSync(`${sameplugin.pluginPath[num]}${sameplugin.pluginname[num]}`, `${this.plugins.bin}${sameplugin.pluginname[num]}`)
								break;
							default://回收站的会直接删除
								fs.unlink(`${this.plugins.bin}${sameplugin.pluginname[num]}`, () => { })
						}
					}
					await streamPipeline(response.body, fs.createWriteStream(textPath));

					await common.sleep(500);//防止消息重叠
					Bot.pickFriend(id).sendMsg("处理完成！此插件已覆盖安装，重启后生效~");
			}
		} else {
			//没开启智能安装直接无脑覆盖
			//下载output_log.txt文件
			const response = await fetch(fileUrl);
			const streamPipeline = promisify(pipeline);
			await streamPipeline(response.body, fs.createWriteStream(textPath));

			Bot.pickFriend(id).sendMsg("此插件已安装，重启后生效~");
		}
	}
}

export default new install()