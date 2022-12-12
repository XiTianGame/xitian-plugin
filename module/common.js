import cfg from '../../../lib/config/config.js'
import ConfigSet from "./ConfigSet.js";


class common {
    constructor() {
        this.permis = ConfigSet.getConfig("auth", "set");
        this.lexicon = ConfigSet.getdefSet("lexicon", "set");
    }
    /**
     * 确认权限
     * @param e 消息
     */
    auth(e) {
        //是否允许群聊
        if (!this.permis.group && e.isGroup) {
            return false;
        }
        //获取授权QQ列表，没有就默认全部主人
        if (this.permis.grade.length == 0 && this.permis.accredit.length == 0) {
            this.permis.grade.push("master")
        }
        //判断权限
        if ((this.permis.grade.indexOf("master") > -1 && e.isMaster)
            || (this.permis.grade.indexOf("owner") > -1 && e?.sender?.role == "owner")
            || (this.permis.grade.indexOf("admin") > -1 && e?.sender?.role == "admin")
            || (this.permis.grade.indexOf("everyone") > -1)
            || (this.permis.accredit.indexOf(e.user_id) > -1)) {
            return true
        }
        //都不是就是未授权
        return false
    }
    /**
     * 插件重命名
     * @param oldname 旧名字
     */
    async rename(oldname) {
        let newname = oldname;
        for (let item of this.lexicon.key) {
            newname = newname.replace(new RegExp(item, 'g'), "");
        }
        newname = `${newname}.js`;
        return newname
    }
}

export default new common()