import fs from 'node:fs'
import ConfigSet from "./module/ConfigSet.js";

let versionData = ConfigSet.getdefSet("version", "set");

const version = (versionData && versionData.length && versionData[0].version) || "1.0.0";

logger.info(`-----------＾ω＾----------`)
logger.info(`插件管理器${version}初始化~`)

/**
* 初始化配置文件
*/
let defSetlist = fs.readdirSync("./plugins/xitian-plugin/defSet/")
defSetlist.forEach(item => {
    if (fs.readdirSync(`./plugins/xitian-plugin/defSet/${item}`).indexOf(".ignore") > -1);
    else {
        let file = `./plugins/xitian-plugin/config/${item}.set.yaml`
        if (!fs.existsSync(file)) {
            fs.copyFileSync(`./plugins/xitian-plugin/defSet/${item}/set.yaml`, file);
        }
    }
});

/**加载插件**/
const files = fs.readdirSync('./plugins/xitian-plugin/apps').filter((file) => file.endsWith('.js'))

let ret = []
files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
});
ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
/*
 *                        _oo0oo_
 *                       o8888888o
 *                       88" . "88
 *                       (| -_- |)
 *                       0\  =  /0
 *                     ___/`---'\___
 *                   .' \\|     |// '.
 *                  / \\|||  :  |||// \
 *                 / _||||| -:- |||||- \
 *                |   | \\\  - /// |   |
 *                | \_|  ''\---/''  |_/ |
 *                \  .-\__  '-'  ___/-. /
 *              ___'. .'  /--.--\  `. .'___
 *           ."" '<  `.___\_<|>_/___.' >' "".
 *          | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *          \  \ `_.   \_ __\ /__ _/   .-` /  /
 *      =====`-.____`.___ \_____/___.-`___.-'=====
 *                        `=---='
 * 
 * 
 *      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * 
 *            佛祖保佑                 永无BUG
 */