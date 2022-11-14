<p align="center">
  <a href="https://github.com/XiTianGame/xitian-plugin">
    <img width="400" src="resources/img/head.jpg">
  </a>
</p>

# 插件管理器xitian-plugin

## 不适配V2，V2装了直接G

~~仅支持js类插件管理，不支持喵喵插件等大型插件管理~~

支持了一点，但不多(bushi)

## 灵感枯竭了，有需要什么插件管理功能的可以提交issue

## 已经实现的功能

- [x] 插件管理
    - [x] 查看全部插件
    - [x] 插件启用停用
    - [x] 插件删除恢复
    - [x] 插件重命名
    - [x] 插件查找
    - [x] 查看插件
- [x] 插件分组管理
    - [x] 创建删除分组
    - [x] 插件设置分组
    - [x] 同步plugins目录下的分组
- [x] 插件智能覆盖安装
- [x] 插件智能重命名
- [x] 更新插件
- [x] 插件管理权限控制
- [x] 插件核验
    - [x] V2插件识别
- [x] plugin插件管理
    - [x] 插件通过网址安装
    - [x] 删除git插件

### 介绍
Yunzai-Bot V3 的插件
为用户提供插件管理功能
js插件可以从[插件库](https://gitee.com/Hikari666/Yunzai-Bot-plugins-index)或其他渠道获取

## 使用说明

### 重要

如果插件出现报错，可能是因为跨版本配置不兼容问题

可以尝试删除config目录下的配置文件然后重启

### 安装

在[yunzai-bot](https://gitee.com/Le-niao/Yunzai-Bot)文件夹根目录打开cmd

使用[github仓库](https://github.com/XiTianGame/xitian-plugin)
```bash
git clone https://github.com/XiTianGame/xitian-plugin.git ./plugins/xitian-plugin/
```

使用[gitee仓库](https://gitee.com/XiTianGame/xitian-plugin)(可能更新不及时)
```bash
git clone https://gitee.com/XiTianGame/xitian-plugin.git ./plugins/xitian-plugin/
```


### 更新

发送#插件更新进行插件管理器更新

或者在xitian-plugin目录打开cmd手动git pull

### 链接

- [云崽](https://gitee.com/Le-niao/Yunzai-Bot)
- [插件库](https://gitee.com/Hikari666/Yunzai-Bot-plugins-index)

### 指令

| 功能 | 指令 | 作用 |
|----|----|----|
| 安装plugin插件 | #安装插件+仓库地址 | 从plugin仓库中克隆插件 |
| (批量)安装插件 | #(批量)安装插件 | 通过QQ发送一个或多个js插件来安装 |
| 停用/启用插件 | #停用/启用插件 | 暂时停用或启用一个插件 |
| 删除/恢复插件 | #删除/恢复插件 | 暂时将一个插件扔到回收站 |
| 删除plugin插件 | #删除插件+插件名(如xitian-plugin) | 删除plugin插件所有文件 |
| 彻底删除插件 | #彻底插件 | 将一个插件彻底删除 |
| 创建/删除分组 | #创建/删除分组 | 创建或删除一个插件分组 |
| (插件)设置分组 | #(插件)设置分组 | 设置一个插件的分组，便于管理 |
| 插件更新 | #插件(管理器)更新 | 更新插件管理器 |
| 插件帮助 | #插件(管理器)帮助 | 查看所有的指令 |

### 其他

- 素材来源于网络，仅供交流学习使用
- 严禁用于商业和非法用途
- 暂无群号，出现问题可以提交issue
- 最后求个star~