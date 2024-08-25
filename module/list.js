import loader from './loader.js'
import config from './config.js'
import base from './base.js'



export default class list extends base {
  constructor(e) {
    super(e);
    this.model = 'list';
  }

  get groups() {
    return config.getConfig('group', 'set')
  }

  async getData() {
    return {
      ...this.screenData,
      saveId: 'list',
      quality: 100,
      listData: this.dealData(),
    }
  }

  dealData() {
    const data = []
    this.groups.group.forEach(group => {
      data.push({
        group: group,
        list: loader.find('', group)
      })
    })
    return data
  }
}