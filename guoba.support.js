import cfg from './module/config.js'
import path from 'node:path'


// 支持锅巴
export function supportGuoba() {
  return {
    // 插件信息，将会显示在前端页面
    pluginInfo: {
      name: 'xitian-plugin',
      title: 'Xitian-Plugin',
      author: '@戏天',
      authorLink: 'https://github.com/XiTianGame',
      link: 'https://github.com/XiTianGame/xitian-plugin',
      isV3: true,
      isV2: false,
      description: '提供JS类的插件管理',
      // 显示图标，此为个性化配置
      icon: 'mdi:stove',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      iconColor: '#00e5d8',
      // 如果想要显示成图片，也可以填写图标路径（绝对路径）
      iconPath: path.resolve('./plugins/xitian-plugin/resources/img/icon.png'),
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        /*
        //情况不对，好像锅巴这块有点问题
        {
          field: 'upload',
          label: '上传js插件',
          bottomHelpMessage: '上传后将会自动安装插件',
          component: 'Upload',
          componentProps: {
            accept: ['.js'],
            helpText: '上传后将会自动安装插件',
            maxNumber: 1,
            maxSize: cfg.getConfig('js', 'set').maxSize / (1024 ^ 2),
            api: async (data, callback) => {
              console.log(data)
              callback({ loaded: 100, total: 100 })
              return { success: true, data: { success: true } }
            }
          },
        },*/
        {
          field: 'js.default_group',
          label: '默认安装分组',
          bottomHelpMessage: '设置后新增插件将安装到该分组',
          component: 'Select',
          componentProps: {
            options: cfg.getConfig('group', 'set').group.map(name => {
              return { label: name, value: name }
            }),
            placeholder: '请选择默认分组',
          },
        },
        {
          field: 'js.maxSize',
          label: '大小限制',
          helpMessage: '换算：1MB=1048576字节',
          bottomHelpMessage: '限制安装插件时的字节大小',
          component: 'InputNumber',
          required: true,
          componentProps: {
            placeholder: '请输入插件限制大小',
          },
        },
        {
          field: 'js.auto_rename',
          label: '智能重命名',
          bottomHelpMessage: '是否开启插件智能重命名',
          component: 'Switch',
        },
        {
          field: 'js.auto_install',
          label: '智能安装',
          bottomHelpMessage: '是否开启插件智能安装',
          component: 'Switch',
        },
        {
          field: 'js.auto_check',
          label: '插件核验',
          bottomHelpMessage: '是否开启插件智能核验',
          component: 'Switch',
        },
        {
          field: 'js.timeout',
          label: '等待时间',
          helpMessage: '插件安装指令的等待时间',
          bottomHelpMessage: '请输入时间，单位秒',
          component: 'InputNumber',
          required: true,
          componentProps: {
            placeholder: '请输入等待时间',
          },
        },
        {
          field: 'group.bin',
          label: '回收站路径',
          helpMessage: '被删除的插件会进入回收站',
          bottomHelpMessage: '路径支持相对和绝对路径',
          component: 'Input',
          componentProps: {
            placeholder: '请输入回收站路径',
          },
        },
        {
          field: 'group.group',
          label: '分组列表',
          component: 'GTags',
          bottomHelpMessage: 'plugins目录下文件夹就是分组',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: 'exclude.rule',
          label: '排除文件夹',
          component: 'GTags',
          bottomHelpMessage: '被排除的文件夹在分组中不会进行同步',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: 'auth.grade',
          label: '操作权限',
          component: 'CheckboxGroup',
          bottomHelpMessage: '设置操作插件的权限',
          componentProps: {
            options: [
              { label: '主人权限', value: 'master' },
              { label: '群主权限', value: 'owner' },
              { label: '群管理权限', value: 'admin' },
              { label: '所有人权限', value: 'everyone' }
            ],
            placeholder: '请选择操作权限'
          },
        },
        {
          field: 'auth.accredit',
          label: '授权QQ',
          helpMessage: '如果为空就默认所有主人QQ',
          component: 'GTags',
          bottomHelpMessage: '授权插件操作的用户QQ',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: 'auth.group',
          label: '群聊操作',
          bottomHelpMessage: '是否允许在群内使用插件管理',
          component: 'Switch',
        },
      ],

      // 获取配置数据方法（用于前端填充显示数据）
      getConfigData() {
        return {
          upload: {},
          js: cfg.getConfig('js', 'set'),
          group: cfg.getConfig('group', 'set'),
          exclude: cfg.getConfig('exclude', 'set'),
          auth: cfg.getConfig('auth', 'set')
        }
      },

      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData(data, { Result }) {
        //保存数据
        Object.keys(data).forEach(key => {
          if (key.startsWith('js.')) {
            cfg.saveSet('js', 'set', 'config', data[key])
          }
          if (key.startsWith('group.')) {
            cfg.saveSet('group', 'set', 'config', data[key])
          }
          if (key.startsWith('exclude.')) {
            cfg.saveSet('exclude', 'set', 'config', data[key])
          }
          if (key.startsWith('auth.')) {
            cfg.saveSet('auth', 'set', 'config', data[key])
          }
        });

        return Result.ok({}, '保存成功~')
      },
    },
  }
}