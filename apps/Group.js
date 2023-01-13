import plugin from '../../../lib/plugins/plugin.js'
import ConfigSet from "../module/ConfigSet.js"
import search from "../module/search.js"
import common from "../module/common.js"
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
            let tmp = item.replace(/\/|plugins/g, "");
            msg.push(`\n${tmp}`);
        });
        e.reply(msg);
        return true;
    }

    async new(e) {
        if (!common.auth(e)) {
            return true;
        }

        let group = e.msg.replace("#创建分组", "");
        plugins.group.forEach(element => {
            let key = element.replace(/plugins|\//g, "");
            if (key == group) {
                e.reply("已经存在该分组了呢~");
                return true;
            }
        });
        let path = `${_path}/plugins/${group}`;
        plugins.group.push(`plugins/${group}/`);
        ConfigSet.saveSet("group", "set", "config", plugins);
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }

    async del(e) {
        if (!common.auth(e)) {
            return true;
        }

        let group = e.msg.replace("#删除分组", "");
        let site = plugins.group.indexOf(`plugins/${group}/`);
        //判断一下分组的位置
        if (site > -1) {
            let path = `${_path}/plugins/${group}`;
            if (fs.existsSync(path)) {
                let tmp = fs.readdirSync(path);
                if (tmp.length > 0) {
                    e.reply("该分组内不为空，请清理分组内插件后重试")
                    return true;
                } else fs.rmdirSync(path);
            } else {
                e.reply("不存在该分组哦~");
            }
            plugins.group.splice(site, 1);
            ConfigSet.saveSet("group", "set", "config", plugins);
            e.reply("删除成功！")
            return true;
        }
    }

    async set(e) {
        if (!common.auth(e)) {
            return true;
        }

        let keyword = e.msg.replace("#", "").split("设置分组");
        //获取全部分组
        let all_group = plugins.group.map(group => {
            return group.replace(/plugins|\//g, "")
        })
        let tmp = await search.find(keyword[0], 0);
        let path
        if (tmp.length == 0) {
            e.reply("没有找到该插件哦");
            return true;
        } else if (tmp.length == 1) {
            path = tmp[0].path + tmp[0].file
            if (!fs.existsSync(path)) {
                e.reply("设置分组失败了呢~" + `\n有没有可能你没有安装“${msg}”插件`);
                return true;
            }
            if (all_group.indexOf(keyword[1]) > -1) {
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

        plugins.group.splice(0, plugins.group.length);//清空一下group

        exclude.rule.push(plugins.bin.replace(/plugins|\//g, ""));//排除列表加上辣姬箱目录
        let pluginlist = fs.readdirSync(`${_path}/plugins`);
        pluginlist.forEach(path => {
            if (fs.statSync(`${_path}/plugins/${path}`).isDirectory()) {
                let key = fs.readdirSync(`${_path}/plugins/${path}`)
                if (key.indexOf("index.js") > -1 || key.indexOf(".git") > -1 || exclude.rule.find(item => path.includes(item)));//匹配排除正则
                else {
                    plugins.group.push(`plugins/${path}/`);
                }
            }
        })
        ConfigSet.saveSet("group", "set", "config", plugins);
        e.reply(`同步完成！当前分组列表：`);
        this.list(e);
        return true
    }
}