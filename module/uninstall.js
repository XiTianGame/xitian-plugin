import { Restart } from '../../other/restart.js'
import fs from 'node:fs'

const _path = process.cwd();

class uninstall {
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
    fs.rmdirSync(path, { recursive: true });
    await e.reply(`成功删除：${name}`);
    new Restart(e).restart();
    return true;
  }
}

export default new uninstall()