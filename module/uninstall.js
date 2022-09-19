import fs from 'fs';


class uninstall {
    constructor() {
    }
    /**
 * 删除文件夹
 * @param path 文件夹目录
 */
    async deleteFolder(path) {
        let files = [];
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path);
            files.forEach(function (file, index) {
                let curPath = path + "/" + file;
                if (fs.statSync(curPath).isDirectory()) {
                    deleteFolder(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }
}

export default new uninstall()