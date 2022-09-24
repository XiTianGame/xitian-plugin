import cfg from '../../../lib/config/config.js'
import common from "../../../lib/common/common.js";
import path from 'path';
import search from './search.js';
import ConfigSet from "./ConfigSet.js";
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";
import fs from 'fs';


class install {
	constructor() {
		/** 获取配置 */
		this.config = ConfigSet.getConfig("js", "set");
		this.plugins = ConfigSet.getConfig("group", "set");
		this.char = ConfigSet.getdefSet("char", "set");
		this.default_num = this.plugins.group.indexOf(`plugins/${this.config.default_group}/`);
	}

	/**
	 * 选择安装文件夹
	 * @param textPath 原本安装目录
	 * @param sameplugin 查找的相似插件列表
	 */
	async choose(textPath, sameplugin) {
		let filePath
		switch (sameplugin.number) {
			case 0:
				filePath = textPath;
				break;
			case 1:
				if (sameplugin.pluginState[0] !== "已删除") {
					filePath = sameplugin.pluginPath[0];
				} else {
					filePath = textPath;
				}
				break;
			default:
				let count = 0;
				while (count < sameplugin.number) {
					if (sameplugin.pluginState[count] !== "已删除") {
						filePath = sameplugin.pluginPath[count];
						break;
					}
					count++;
				}
				if (!filePath) {
					filePath = textPath;
				}
				break;
		}
		return filePath
	}

	/**
	* 进行插件安装
	* @param fileUrl 文件下载链接
	* @param textPath 安装目录
	* @param filename 插件文件名
	* @param id 用于发送安装状态信息的用户QQ
	*/
	async install(fileUrl, textPath, filename, id = cfg.masterQQ[0]) {
		//智能安装
		if (this.config.auto_install && filename) {
			let sameplugin = await search.find(filename.replace(/.js|.bak|v3|V3|\[.*?\]|\(.*?\)|\（.*?\）|\[.*?\]|\【.*?\】|\-|\_|[0-9]+/g, ""), 0);//提取插件关键名字
			let filePath = await this.choose(textPath, sameplugin);
			//下载output_log.txt文件
			const response = await fetch(fileUrl);
			const streamPipeline = promisify(pipeline);
			//根据不同匹配数来运行不同安装操作
			switch (sameplugin.number) {
				case 0:
					await streamPipeline(response.body, fs.createWriteStream(path.join(filePath, `${filename}.bak`)));
					//核验插件
					if (this.config.auto_check) {
						await this.check(path.join(filePath, `${filename}.bak`), id);
					}
					await common.sleep(200);//防止消息重叠
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
					await streamPipeline(response.body, fs.createWriteStream(path.join(filePath, `${filename}.bak`)));
					//核验插件
					if (this.config.auto_check) {
						await this.check(path.join(filePath, `${filename}.bak`), id);
					}
					await common.sleep(200);//防止消息重叠
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
					await streamPipeline(response.body, fs.createWriteStream(path.join(filePath, `${filename}.bak`)));
					//核验插件
					if (this.config.auto_check) {
						await this.check(path.join(filePath, `${filename}.bak`), id);
					}
					await common.sleep(200);//防止消息重叠
					Bot.pickFriend(id).sendMsg("处理完成！此插件已覆盖安装，重启后生效~");
			}
		} else {
			//没开启智能安装直接无脑覆盖
			//下载output_log.txt文件
			const response = await fetch(fileUrl);
			const streamPipeline = promisify(pipeline);
			await streamPipeline(response.body, fs.createWriteStream(path.join(textPath, `${filename}.bak`)));
			//核验插件
			if (this.config.auto_check) {
				await this.check(path.join(filePath, `${filename}.bak`), id);
			}
			await common.sleep(200);//防止消息重叠
			Bot.pickFriend(id).sendMsg("此插件已安装，重启后生效~");
		}
	}

	/**
	 * 对插件进行核验
	 * @param {String} filepath 插件路径
	 * @param {Number} id 发送核验结果的用户QQ
	 */
	async check(filepath, id) {
		//读取插件
		let content = fs.readFileSync(filepath, 'utf8', (error) => {
			Bot.pickFriend(id).sendMsg("插件读取出现问题，核验已终止");
			fs.renameSync(filepath, filepath.substring(0, filepath.length - 4));
			return true;
		});
		//V2非法语句
		if (this.char.V2.find(item => content.includes(item))) {
			Bot.pickFriend(id).sendMsg("检测到非法语句，该插件疑似V2插件，插件管理器已将其停用");
			return false;
		}
		//去除.bak，启用该插件
		fs.renameSync(filepath, filepath.substring(0, filepath.length - 4));
		Bot.pickFriend(id).sendMsg("核验完成！该插件无问题");
		return true;
	}
}

export default new install()