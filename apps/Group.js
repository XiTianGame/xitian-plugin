import plugin from '../../../lib/plugins/plugin.js'
import ConfigSet from "../module/ConfigSet.js"
import search from "../module/search.js"
import common from "../module/common.js"
import PATH from "path"
import fs from 'fs';

const _path = process.cwd();//云崽目录

let plugins = ConfigSet.getConfig("group","set");
let exclude = ConfigSet.getConfig("exclude","set");

export class Group extends plugin {
    constructor() {
        super({
            name: '分组',
            dsc: '提供js插件分组管理',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#分组列表$',
                    fnc: 'list'
                },
                {
                    reg: '^#创建分组(.*)$',
                    fnc: 'new'
                },
                {
                    reg: '^#删除分组(.*)$',
                    fnc: 'del'
                },
                {
                    reg: '^#(.*)设置分组(.*)$',
                    fnc: 'set'
                },
                {
                    reg: '^#同步分组$',
                    fnc: 'sync'
                }
            ]
        })
    }

    async list(e) {
        if (!common.auth(e)) {
            return true;
        }

        let msg = ["====分组列表===="]
        plugins.group.forEach(item => {
            msg.push(`\n${item}`);
        });
        e.reply(msg);
        return true;
    }

    async new(e) {
        if (!common.auth(e)) {
            return true;
        }

        let group = e.msg.replace("#创建分组", "");
        plugins.group.forEach(key => {
            if (key == group) {
                e.reply("已经存在该分组了呢~");
                return true;
            }
        });
        let path = PATH.join(_path,'plugins',group)
        plugins.group.push(group);
        ConfigSet.saveSet("group", "set", "config", plugins);
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
        return true;
    }

    async del(e) {
        if (!common.auth(e)) {
            return true;
        }

        let group = e.msg.replace("#删除分组", "");
        let site = plugins.group.indexOf(group);
        //删除路径
        let path = PATH.join(_path,'plugins',group);
        if (fs.existsSync(path) && fs.statSync(path).isDirectory()) {
            let tmp = fs.readdirSync(path);
            if (tmp.length > 0) {
                e.reply("该分组内不为空，请清理分组内插件后重试")
                return true;
            } else fs.rmdirSync(path);
        } else {
            e.reply("不存在该分组文件夹哦~");
        }
        //判断一下分组的位置
        if (site > -1) {
            plugins.group.splice(site, 1);
            ConfigSet.saveSet("group", "set", "config", plugins);
            e.reply("删除成功！")
        } else {
            e.reply("不存在该分组配置");
        }
        return true;
    }

    async set(e) {
        if (!common.auth(e)) {
            return true;
        }

        let keyword = e.msg.replace("#", "").split("设置分组");
        //获取全部分组
        let tmp = await search.find(keyword[0], 0);
        if (tmp.length == 0) {
            e.reply("没有找到该插件哦");
            return true;
        } else if (tmp.length == 1) {
            let path = tmp[0].path + tmp[0].file
            if (!fs.existsSync(path)) {
                e.reply("设置分组失败了呢~" + `\n有没有可能你没有安装“${msg}”插件`);
                return true;
            }
            if (plugins.group.indexOf(keyword[1]) > -1) {
                fs.renameSync(path, `plugins/${keyword[1]}/${tmp[0].file}`)
                e.reply(`成功设置插件“${keyword[0]}”为分组${keyword[1]}~`);
            } else {
                e.reply("没有这个分组呢");
                return true;
            }
        } else if (tmp.length > 1) {
            e.reply("找到多个插件，请指定准确的插件名哦");
        }
        return true;
    }

    async sync(e) {
        if (!common.auth(e)) {
            return true;
        }

        plugins.group = [];//清空一下group
        let ignore = exclude.rule;//排除列表
        ignore.push(PATH.normalize(plugins.bin).split("\\").pop());//排除列表加上辣姬箱目录
        let pluginlist = fs.readdirSync(PATH.join(_path,'plugins'));
        pluginlist.forEach(name => {
            let path = PATH.join(_path,'plugins',name);
            if (fs.statSync(path).isDirectory()) {
                let key = fs.readdirSync(path)
                if (key.includes("index.js") || (fs.existsSync(PATH.join(path,'.git')) && fs.statSync(PATH.join(path,'.git')).isDirectory()) || ignore.includes(name));//匹配排除正则
                else {
                    plugins.group.push(name);
                }
            }
        })
        ConfigSet.saveSet("group", "set", "config", plugins);
        e.reply(`同步完成！当前分组列表：`);
        this.list(e);
        return true
    }
}