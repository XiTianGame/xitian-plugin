import fs from 'fs';
import chokidar from "chokidar";
import ConfigSet from "../module/ConfigSet.js";



class search {
	constructor() {
		/** 读取配置 */
		this.plugins = ConfigSet.getConfig("group", "set");
		this.startwatch();
	}

	/**
	 * 查找插件
	 * @param name 插件名字
	 * @param mode 0模糊查找 1精确查找
	 */
	async find(name, mode = 0) {

		let pluginPath = [], pluginState = [], pluginname = []
		let number = 0
		//读取插件列表
		await this.read();
		//历遍文件查找关键字
		for (let tmp in this.plugins_file)
			this.plugins_file[tmp].map((filename) => {
				if (mode == 0) {
					if (filename.includes(name)) {
						pluginPath.push(this.plugins.group[tmp])
						pluginname.push(filename)
						if (filename.endsWith('.bak')) {
							pluginState.push("停用")
						} else pluginState.push("启用")
						number++
					}
				} else {
					filename = filename.split(".");
					if (filename[0] == name) {
						pluginPath.push(this.plugins.group[tmp])
						pluginname.push(filename.join("."));
						if (filename[filename.length - 1] == "bak") {
							pluginState.push("停用")
						} else pluginState.push("启用")
						number++
					}
				}
			});
		//然后再看看辣姬箱
		this.bin_file.map((filename) => {
			if (mode == 0) {
				if (filename.includes(name)) {
					pluginPath.push(this.plugins.bin)
					pluginname.push(filename)
					pluginState.push("已删除")
					number++
				}
			} else {
				filename = filename.split(".");
				if (filename[0].replace(/\[.*?\]/g, "") == name) {
					pluginPath.push(this.plugins.bin)
					pluginname.push(filename.join("."))
					pluginState.push("已删除")
					number++
				}
			}
		});
		//返回插件路径，状态，名称，匹配个数
		return { pluginPath, pluginState, pluginname, number };
	}

	/**
	 * 开始监视文件夹
	 */
	async startwatch(){
		this.plugins.group.forEach(item => {
			this.watch(item,"plugins_file");
		});
		this.watch(this.plugins.bin,"bin_file");
	}

	/**
	 * 读取插件列表
	 */
	async read() {
		if (!this.plugins_file) {
			this.plugins_file = [];
			for (let tmp in this.plugins.group) {
				this.plugins_file.push(fs.readdirSync(this.plugins.group[tmp]));
			}
		}
		if (!this.bin_file) {
			this.bin_file = fs.readdirSync(this.plugins.bin)
		}
		return {
			plugins: [...this.plugins_file],
			bin: [...this.bin_file]
		}
	}

	/**
	 * 监听文件夹
	 * @param file 监听目录  
	 * @param filename 对应列表名
	 */
	async watch(file, filename) {
		const watcher = chokidar.watch(file,{
			//忽略开始监控的文件添加
			ignoreInitial:true,
			persistent:true,
			cwd: '.',
		});
		watcher.on("all", (path) => {
			if (this[filename]) {
				delete this[filename];
			}
		});
	}
}

export default new search()