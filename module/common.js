import cfg from '../../../lib/config/config.js'
import ConfigSet from "./ConfigSet.js";


class common {
    constructor() {
		this.permis = ConfigSet.getConfig("auth", "set");
	}
    /**
     * 确认权限
     * @param e 消息
     */
    async auth(e){
        //是否允许群聊
        if(!this.permis.group && e.isGroup){
            return false;
        }
        //获取授权QQ列表，没有就默认全部主人
        let list = [];
        if(this.permis.grade.length==0 && this.permis.accredit.length==0){
            list = cfg.masterQQ;
        }else if(this.permis.accredit.length==0){
            list = this.permis.accredit.length;
        }
        //判断权限
        if((this.permis.grade.indexOf("master")>-1 &&e.isMaster)
        ||(this.permis.grade.indexOf("owner")>-1 && e?.sender?.role== "owner")
        ||(this.permis.grade.indexOf("admin")>-1 && e?.sender?.role== "admin")
        ||(this.permis.grade.indexOf("everyone")>-1)
        ||(this.permis.accredit.indexOf(e.user_id)>-1)){
            return true
        }
        //都不是就是未授权
        return false
    }
}

export default new common()