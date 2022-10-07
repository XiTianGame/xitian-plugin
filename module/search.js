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
		await this.read();
		for(let i in this.plugins.group){
			if(!fs.existsSync(this.plugins.group[i])){
				fs.mkdirSync(this.plugins.group[i])
			}
			this.watch(this.plugins.group[i],"plugins_file",i)
		}
		if(!fs.existsSync(this.plugins.bin)){
			fs.mkdirSync(this.plugins.bin)
		}
		this.watch(this.plugins.bin,"bin_file")
	}

	/**
	 * 读取插件列表
	 */
	async read() {
		if (!this.plugins_file) {
			this.plugins_file = [];
			for (let tmp of this.plugins.group) {
				this.plugins_file.push(fs.readdirSync(tmp));
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
	 * @param group 对应列表名
	 * @param num 插件分组位置
	 */
	async watch(file, group ,num = "戏天出品") {
		//转换文件路径
		const _file = file.replace(/\//g,"\\")
		const watcher = chokidar.watch(file,{
			//忽略开始监控的文件添加
			ignoreInitial:true,
			persistent:true,
			cwd: '.',
		});
		watcher.on("add", (path) => {
			if(!isNaN(num)){
				this[group][num].push(path.replace(_file,""))
			}else{
				this[group].push(path.replace(_file,""))
			}
		}).on("unlink",(path)=>{
			if(!isNaN(num)){
				let id = this[group][num].indexOf(path.replace(_file,""));
				this[group][num].splice(id,1);
			}else{
				let id = this[group].indexOf(path.replace(_file,""));
				this[group].splice(id,1);
			}
		})
	}
}

export default new search()