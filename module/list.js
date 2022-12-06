import ConfigSet from "./ConfigSet.js"
import search from "./search.js"
import base from "./base.js"



export default class list extends base {
    constructor(e) {
        super(e);
        this.model = "list";
    }

    async getData() {
        let Data = await this.dealData();
        return {
            ...this.screenData,
            saveId: "list",
            quality: 100,
            listData: Data,
        }
    }

    async dealData(type = 'group') {
        let Plugin = await search.read();
        let groups = ConfigSet.getConfig('group', 'set')[type];
        let data = [];
        groups.forEach(group => {
            data.push({
                group: group,
                list: Plugin.get(group)
            })
        });
        return data
    }
}