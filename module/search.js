import fs from 'fs';
import chokidar from "chokidar";
import ConfigSet from "../module/ConfigSet.js";

const Plugins = new Map()

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
		for (let group of this.plugins.group)
		    Plugins.get(group).map((filename) => {
				if (mode == 0) {
					if (filename.includes(name)) {
						pluginPath.push(group)
						pluginname.push(filename)
						if (filename.endsWith('.bak')) {
							pluginState.push("停用")
						} else pluginState.push("启用")
						number++
					}
				} else {
					filename = filename.split(".");
					if (filename[0] == name) {
						pluginPath.push(group)
						pluginname.push(filename.join("."));
						if (filename[filename.length - 1] == "bak") {
							pluginState.push("停用")
						} else pluginState.push("启用")
						number++
					}
				}
			});
		//然后再看看辣姬箱
		Plugins.get(this.plugins.bin).map((filename) => {
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
		await this.read();
		for(let i in this.plugins.group){
			if(!fs.existsSync(this.plugins.group[i])){
				fs.mkdirSync(this.plugins.group[i])
			}
			this.watch(this.plugins.group[i])
		}
		if(!fs.existsSync(this.plugins.bin)){
			fs.mkdirSync(this.plugins.bin)
		}
		this.watch(this.plugins.bin)
	}

	/**
	 * 读取插件列表
	 */
	async read() {
		for (let tmp of this.plugins.group) {
			if(Plugins.has(tmp)) continue;
			Plugins.set(tmp,fs.readdirSync(tmp))
		}
		if(!Plugins.has(this.plugins.bin)){
			Plugins.set(this.plugins.bin,fs.readdirSync(this.plugins.bin))
		}
		return Plugins
	}

	/**
	 * 监听文件夹
	 * @param file 监听目录  
	 */
	async watch(file) {
		//转换文件路径
		const _file = file.replace(/\//g,"\\")
		const watcher = chokidar.watch(file,{
			//忽略开始监控的文件添加
			ignoreInitial:true,
			persistent:true,
			cwd: '.',
		});
		watcher.on("add", (path) => {
			let tmp = Plugins.get(file)||[]
			tmp.push(path.replace(_file,""))
			Plugins.set(file,tmp)
		}).on("unlink",(path)=>{
			let tmp = Plugins.get(file)||[]
			let id = tmp.indexOf(path.replace(_file,""));
			tmp.splice(id,1);
			Plugins.set(file,tmp)
		})
	}
}

export default new search()