import fs from 'fs';
import chokidar from "chokidar";
import lodash from "lodash"
import ConfigSet from "../module/ConfigSet.js";

const _path = process.cwd().replace(/\\/g,'/')

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
		    Plugins.get(group).forEach((file) => {
				if (mode == 0) {
					if (file.key.includes(name)) {
						pluginPath.push(group)
						pluginname.push(file.key)
						pluginState.push(file.state)
						number++
					}
				} else {
					let tmp = file.key.split(".");
					if (tmp[0] == name) {
						pluginPath.push(group)
						pluginname.push(file.key)
						pluginState.push(file.state)
						number++
					}
				}
			});
		//然后再看看辣姬箱
		Plugins.get(this.plugins.bin).forEach((file) => {
			if (mode == 0) {
				if (file.key.includes(name)) {
					pluginPath.push(this.plugins.bin)
					pluginname.push(file.key)
					pluginState.push(file.state)
					number++
				}
			} else {
				let tmp = file.key.split(".");
				if (tmp[0].replace(/\[.*?\]/g, "") == name) {
					pluginPath.push(this.plugins.bin)
					pluginname.push(file.key)
					pluginState.push(file.state)
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
		this.watch(this.plugins.bin, true)
	}

	/**
	 * 读取插件列表
	 */
	async read() {
		for (let group of this.plugins.group) {
			if(Plugins.has(group)) continue;
			let Infos = [];
			for(let file of fs.readdirSync(group)){
				Infos.push({
					...await this.parse(`${group}${file}`)
				})
			}
			Plugins.set(group,Infos)
		}
		if(!Plugins.has(this.plugins.bin)){
			let Infos = [];
			for(let file of fs.readdirSync(this.plugins.bin)){
				Infos.push({
					...await this.parse(`${this.plugins.bin}${file}`,true)
				})
			}
			Plugins.set(this.plugins.bin,Infos)
		}
		return Plugins
	}

	/**
	 * 解析插件
	 * @param path 文件路径
	 * @param isBin 是否是回收站
	 */
	async parse(path,isBin = false){
		let tmp = path
		//是文件夹
		if(fs.statSync(path).isDirectory()) return {
			type:'folder',
			key:tmp.split('/').pop(),
			path: path,
			name: '???',
			dsc: '???',
			state: '???'
		}
		let Info = fs.readFileSync(path,'utf8').match(/name: ?('|"|`).*,|dsc: ?('|"|`).*,/g) || []
		Info = Info.map(i=>{return i.replace(/name:|dsc:| |'|"|`|,/g,'')});
		switch(Info.length){
			case 0:
				Info = ['???','???'];
				break;
			case 1:
				Info.push(Info[0]);
				break;
			case 2:
				break;
			default:
				Info = Info.slice(0,2);
		}
		const type = path.split('.').pop()||'???'
		const state = isBin?'已删除':`${type === 'js'?'启用':type === 'bak'?'停用':'???'}`
		return {
			type: type,
			key: tmp.split('/').pop(),
			path: path,
			name: Info[0] || '???',
			dsc: Info[1] || '???',
			state: state
		}
	}

	/**
	 * 监听文件夹
	 * @param file 监听目录
	 * @param isBin 是否是回收站  
	 */
	async watch(file,isBin = false) {
		//转换文件路径
		const _file = file.replace(/\//g,"\\")
		const watcher = chokidar.watch(file,{
			//忽略开始监控的文件添加
			ignoreInitial:true,
			persistent:true,
			cwd: '.',
		});
		watcher.on("add", async (path) => {
			let tmp = Plugins.get(file)||[]
			tmp.push(await this.parse(path.replace(/\\/g,'/'),isBin))
			//重新排序
			tmp = lodash.orderBy(tmp,'key','asc')
			Plugins.set(file,tmp)
		}).on("addDir", async (path) => {
			let tmp = Plugins.get(file)||[]
			tmp.push(await this.parse(path.replace(/\\/g,'/'),isBin))
			//重新排序
			tmp = lodash.orderBy(tmp,'key','asc')
			Plugins.set(file,tmp)
		}).on("unlink", async (path)=>{
			let tmp = Plugins.get(file)||[]
			let id = null;
			tmp.forEach((item,i) => {
				if(item.key === path.replace(_file,"")){
					id = i
				}
			});
			tmp.splice(id,id === null?0:1);
			Plugins.set(file,tmp)
		}).on("unlinkDir", async (path)=>{
			let tmp = Plugins.get(file)||[]
			let id = null;
			tmp.forEach((item,i) => {
				if(item.key === path.replace(_file,"")){
					id = i
				}
			});
			tmp.splice(id,id === null?0:1);
			Plugins.set(file,tmp)
		}).on("error", (error)=>{
			logger.error(`[插件管理器]监听插件错误:\n${error}`)
		})
	}
}

export default new search()