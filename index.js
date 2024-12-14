import { execSync } from 'node:child_process'
import config from './module/config.js'
import fs from 'node:fs'

if (!globalThis.segment) {
  globalThis.segment = (await import('oicq')).segment
}

let versionData = config.getdefSet('version', 'set');

const version = (versionData && versionData.length && versionData[0].version) || '1.0.0';

logger.info(`-----------＾ω＾----------`)
logger.info(`插件管理器${version}初始化~`)

if (!await import('acorn').catch(() => { })) {
  logger.warn('检测到未安装依赖包，尝试安装中...')
  let npm = 'npm'
  if (fs.existsSync('node_modules/.pnpm')) npm = 'pnpm'
  if (fs.existsSync('node_modules/.yarn-integrity')) npm = 'yarn'
  if (fs.existsSync('node_modules/.cache')) npm = 'bun'
  try {
    logger.info('安装完成，输出：\n' + execSync(`${npm} install`, { cwd: config.baseDir }))
  } catch (err) {
    logger.error('安装失败，错误信息：' + err)
  }
}

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
 *                       88' . '88
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
 *           .'' '<  `.___\_<|>_/___.' >' ''.
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