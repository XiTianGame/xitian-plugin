import YAML from "yaml";
import fs from "node:fs";
import chokidar from "chokidar";
import PATH from "path";
import lodash from "lodash";

/** 配置文件 直接借鉴yunzai配置代码 */
class ConfigSet {
    constructor() {
        /** 默认设置 */
        this.defSetPath = "./plugins/xitian-plugin/defSet/";
        this.defSet = {};

        /** 用户设置 */
        this.configPath = "./plugins/xitian-plugin/config/";
        this.config = {};

        /** 文件读取 */
        this.file = { config: {}, defSet: {} };

        /** 监听文件 */
        this.watcher = { config: {}, defSet: {} };

        this.ignore = ['char.set', 'help.set', 'lexicon.set', 'version.set'];
    }

    /**
     * 拼接分组路径
     * @param name 分组名
     */
    group(name) {
        return PATH.join("./plugins", name, "/")
    }

    /**
     * @param app  功能
     * @param name 配置文件名称
     */
    getdefSet(app, name) {
        return this.getYaml(app, name, "defSet");
    }

    /** 用户配置 */
    getConfig(app, name) {
        if (this.ignore.includes(`${app}.${name}`)) return this.getdefSet(app, name);
        this.checkConfig(app, name)

        return {
            ...this.getdefSet(app, name),
            ...this.getYaml(app, name, "config"),
        };
    }

    /**
     * 读取文件
     * @param app 功能
     * @param name 名称
     * @param type 默认跑配置-defSet，用户配置-config
     */
    getFile(app, name, type = "defSet") {
        let file = this.getFilePath(app, name, type);
        let key = `${app}.${name}`;

        if (this.file[type][key]) return this.file[type][key];

        this.file[type][key] = fs.readFileSync(file, "utf8");

        this.watch(file, app, name, type);

        return this.file[type][key]
    }

    /**
     * 获取配置yaml
     * @param app 功能
     * @param name 名称
     * @param type 默认跑配置-defSet，用户配置-config
     */
    getYaml(app, name, type = "defSet") {
        let key = `${app}.${name}`;

        if (this[type][key]) return this[type][key];

        if (!this.file[type][key]) this.getFile(app, name, type);
        this[type][key] = YAML.parse(this.file[type][key]);

        return this[type][key];
    }

    checkConfig(app, name) {
        let file = this.getFilePath(app, name, "config");
        if (!fs.existsSync(file)) {
            logger.debug(`创建用户配置文件[${app}][${name}]`)
            this.cpCfg(app, name);
        }
    }

    cpCfg(app, name, force = false) {
        let set = this.getFilePath(app, name, "config");
        if (force || !fs.existsSync(set)) {
            fs.copyFileSync(this.getFilePath(app, name, "defSet"), set);
        }
    }

    getFilePath(app, name, type) {
        if (type == "defSet") return `${this.defSetPath}${app}/${name}.yaml`;
        else return `${this.configPath}${app}.${name}.yaml`;
    }

    /** 监听配置文件 */
    watch(file, app, name, type = "defSet") {
        let key = `${app}.${name}`;

        if (this.watcher[type][key]) return;

        const watcher = chokidar.watch(file);
        watcher.on("change", (path) => {
            delete this[type][key];
            delete this.file[type][key];
            logger.mark(`[修改配置文件][${type}][${app}][${name}]`);
        });

        this.watcher[type][key] = watcher;
    }

    /**
     * 保存设置
     * @param app 功能
     * @param name 名称
     * @param type 类型
     * @param data 数据
     */
    saveSet(app, name, type, data) {
        let file = this.getFilePath(app, name, type);
        let origin = this.getFile(app, name, type);
        let notes = this.getNote(origin)
        if (lodash.isEmpty(data)) {
            fs.existsSync(file) && fs.unlinkSync(file);
        } else {
            data = YAML.stringify(data);
            //插入注释
            data = this.Insert(notes, data);

            fs.writeFileSync(file, data, "utf8");
        }
    }

    /**获取yaml注释 */
    getNote(file) {
        let annotate = {}
        file = file.split('\n')
        let tmp = [];
        for (let v of file) {
            if (v.startsWith('#')) {
                tmp.push(v);
            } else {
                v = v.split(":");
                if (v.length < 2) {
                    continue;
                }
                annotate[v[0]] = tmp;
                tmp = [];
            }
        }
        return annotate;
    }

    /**
     * 填充注释
     * @param notes 注释本体
     * @param data 数据
     */
    Insert(notes, data) {
        data = data.split('\n')
        for (let key of Object.keys(notes)) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].startsWith(`${key}:`)) {
                    data.splice(i, 0, notes[key].join(""))
                    i++
                }
            };
        }
        data = data.join('\n');
        return data
    }
}

export default new ConfigSet();
