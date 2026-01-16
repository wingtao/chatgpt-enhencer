# BearGPT - ChatGPT 增强器

一个提升 ChatGPT 使用体验的浏览器扩展，提供问题目录导航和自定义内容宽度等功能。

## 功能特性

### 📑 问题目录导航
- 自动提取对话中的所有用户提问
- 在页面左侧生成可折叠的导航面板
- 点击问题快速定位到对应位置
- 支持显示/隐藏切换，状态自动保存

### 📏 自定义内容宽度
- 通过扩展弹窗调整对话内容显示宽度
- 支持 10%-100% 自由调整
- 配置自动保存，页面刷新后保持

## 技术栈

- [Plasmo](https://docs.plasmo.com/) - 浏览器扩展开发框架
- React + TypeScript
- Chrome Extension API

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 加载扩展到浏览器

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录下的 `build/chrome-mv3-dev` 文件夹

### 项目结构

- `popup.tsx` - 扩展弹窗界面（自定义宽度设置）
- `content.ts` - 内容脚本主逻辑（问题目录、DOM 监听）
- `content.css` - 注入页面的样式
- `contentPrompt.ts` - Prompt 相关功能（预留）
- `contants.ts` - 常量定义

## 构建生产版本

```bash
pnpm build
```

构建完成后，产物位于 `build/chrome-mv3-prod` 目录，可直接打包上传到 Chrome 应用商店。

## 适用网站

- https://chat.openai.com/*
- https://chatgpt.com/*

## 许可证

MIT License

## 作者

wingtao
