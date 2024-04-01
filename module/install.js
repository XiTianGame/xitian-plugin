import cfg from '../../../lib/config/config.js'
import common from "../../../lib/common/common.js"
import commons from '../module/common.js'
import { Restart } from "../../other/restart.js"
import moment from 'moment'
import path from 'path'
import search from './search.js'
import ConfigSet from "./ConfigSet.js"
import fetch from "node-fetch"
import { exec, execSync } from 'child_process'
import { pipeline } from "stream"
import { promisify } from "util"
import fs from 'fs'

//云崽目录
const _path = process.cwd();

class install {
	constructor() {
		/** 获取配置 */
		this.config = ConfigSet.getConfig("js", "set");
		this.plugins = ConfigSet.getConfig("group", "set");
		this.char = ConfigSet.getdefSet("char", "set");
	}

	/**
	 * 选择安装文件夹
	 * @param textPath 原本安装目录
	 * @param sameplugin 查找的相似插件列表
	 */
	async choose(textPath, sameplugin) {
		let filePath
		switch (sameplugin.length) {
			case 0:
				filePath = textPath;
				break;
			case 1:
				if (sameplugin[0].state !== "已删除") {
					filePath = sameplugin[0].path;
				} else {
					filePath = textPath;
				}
				break;
			default:
				let count = 0;
				while (count < sameplugin.length) {
					if (sameplugin[count].state !== "已删除") {
						filePath = sameplugin[count].path;
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
			let sameplugin = await search.find((await commons.rename(filename)).replace(/.js|.bak/g, ""), 1);//提取插件关键名字
			let filePath = await this.choose(textPath, sameplugin);
			//下载文件
			const response = await fetch(fileUrl);
			const streamPipeline = promisify(pipeline);
			//根据不同匹配数来运行不同安装操作
			switch (sameplugin.length) {
				case 0:
					await streamPipeline(response.body, fs.createWriteStream(path.join(filePath, `${filename}.bak`)));
					//核验插件
					if (await this.check(path.join(filePath, `${filename}.bak`), id)) {
						Bot.pickFriend(id).sendMsg("此插件已安装，重启后生效~");
					}
					break;
				case 1:
					Bot.pickFriend(id).sendMsg(`检测到相似插件:${sameplugin[0].file.replace(/.js|.bak/g, "")}，正在执行覆盖安装`);
					//根据插件不同的状态分类处理
					switch (sameplugin[0].state) {
						case '启用':
							fs.renameSync(path.join(sameplugin[0].path, sameplugin[0].file), path.join(this.plugins.bin, `${sameplugin[0].file}.bak`))
							break;
						case '停用':
							fs.renameSync(path.join(sameplugin[0].path, sameplugin[0].file), path.join(this.plugins.bin, `${sameplugin[0].file}`))
							break;
						default://回收站的不做处理
					}
					await streamPipeline(response.body, fs.createWriteStream(path.join(filePath, `${filename}.bak`)));
					await common.sleep(200);//防止消息重叠
					//核验插件
					if (await this.check(path.join(filePath, `${filename}.bak`), id)) {
						Bot.pickFriend(id).sendMsg("此插件已覆盖安装，重启后生效~");
					}
					break;
				default:
					Bot.pickFriend(id).sendMsg("检测到多个相似插件，正在进行处理...");
					let num;//由于搜索逻辑，这里要从后往前排
					for (num = sameplugin.length - 1; num >= 0; num--) {
						switch (sameplugin[num].state) {
							case '启用':
								fs.renameSync(path.join(sameplugin[num].path, sameplugin[num].file), path.join(this.plugins.bin, `${sameplugin[num].file}.bak`))
								break;
							case '停用':
								fs.renameSync(path.join(sameplugin[num].path, sameplugin[num].file), path.join(this.plugins.bin, sameplugin[num].file))
								break;
							default://回收站的会直接删除
								fs.unlinkSync(path.join(this.plugins.bin, sameplugin[num].file))
						}
					}
					await streamPipeline(response.body, fs.createWriteStream(path.join(filePath, `${filename}.bak`)));
					await common.sleep(200);//防止消息重叠
					//核验插件
					if (await this.check(path.join(filePath, `${filename}.bak`), id)) {
						Bot.pickFriend(id).sendMsg("处理完成！此插件已覆盖安装，重启后生效~");
					}
			}
		} else {
			//没开启智能安装直接无脑覆盖
			filename = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss') + '.js'
			//下载文件
			const response = await fetch(fileUrl);
			const streamPipeline = promisify(pipeline);
			await streamPipeline(response.body, fs.createWriteStream(path.join(textPath, `${filename}.bak`)));
			//核验插件
			if (await this.check(path.join(textPath, `${filename}.bak`), id)) {
				Bot.pickFriend(id).sendMsg("此插件已安装，重启后生效~");
			}
		}
	}

	/**
	 * 对插件进行核验
	 * @param {String} filepath 插件路径
	 * @param {Number} id 发送核验结果的用户QQ
	 */
	async check(filepath, id) {
		if (!this.config.auto_check) {
			fs.renameSync(filepath, filepath.substring(0, filepath.length - 4));
			return true;
		}
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

	/**
	 * 安装github插件
	 * @param url 插件地址
	 * @param e 消息
	 */
	async clone(url, e) {
		if (!url.endsWith(".git")) {
			url = url + ".git";
		}
		/**插件名 */
		let name = url.replace(/https:|github|gitee|.git/g, "").split("/");
		name = name.pop();
		e.reply(`开始安装：${name}`)

		/**检查链接和插件 */
		if (!await this.checkurl(url)) {
			e.reply(`安装失败！无法连接到目标仓库`)
			return true;
		}

		/**检查已安装情况 */
		if (await this.checkname(name)) {
			e.reply(`已经安装该插件，若该插件无法运行，可以尝试重新安装`)
			return true;
		}

		/**检查git安装 */
		if (!await this.checkGit(e)) return true;

		/**执行安装命令 */
		let command = `cd ${_path}/plugins && git clone ${url}`;
		let result = await this.execSync(command);

		if (result.error) {
			await e.reply(`安装${name}失败,错误信息:\n${result.error}`);
			return true;
		}
		/**重启云崽 */
		await e.reply("安装成功!即将进行重启...");
		this.restart(e);
		return true;
	}

	/**
	 * 检查插件地址有效性
	 * @param url 插件地址
	 */
	async checkurl(url) {
		//检查链接
		let response
		try {
			response = await fetch(url);
		} catch (err) {
			return false;
		}
		if (response.status !== 200) return false;

		return true;
	}

	/**
	 * 是否已经安装该插件
	 * @param name 插件名
	 */
	async checkname(name) {
		//检查重复插件
		let list = fs.readdirSync(`${_path}/plugins`);
		if (list.indexOf(name) > -1) return true;

		return false;
	}

	/**
	 * 检查git是否安装
	 * @returns
	 */
	async checkGit(e) {
		let ret = await execSync('git --version', { encoding: 'utf-8' })
		if (!ret || !ret.includes('git version')) {
			await e.reply('请先安装git')
			return false
		}

		return true
	}

	/**
	 * 执行cmd命令
	 * @param {string} cmd git命令
	 * @returns
	 */
	async execSync(cmd) {
		return new Promise((resolve, reject) => {
			exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
				resolve({ error, stdout, stderr })
			})
		})
	}

	/**
	 * 重启云崽
	 */
	restart(e) {
		new Restart(e).restart()
	}
}

export default new install()