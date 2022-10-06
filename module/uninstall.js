import fs from 'fs';

const _path = process.cwd();

class uninstall {
    constructor() {
    }

    /**
     * 删除插件
     * @param e 消息
     */
    async removePlugin(e) {
        let name = e.msg.replace(/#|彻底|删除插件/g, "");
        let path = `${_path}/plugins/${name}`;
        if (!fs.existsSync(path)) return false;
        //包含git文件夹
        if (!fs.statSync(`${path}/.git`).isDirectory()) return false;

        await this.deleteFolder(path);
        e.reply(`成功删除：${name}`);
        return true;
    }

    /**
     * 删除文件夹
     * @param path 文件夹目录
     */
    async deleteFolder(path) {
        let files = [];
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path);
            files.forEach(async (file, index) => {
                let curPath = path + "/" + file;
                if (fs.statSync(curPath).isDirectory()) {
                    await this.deleteFolder(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
        return true;
    }
}

export default new uninstall()