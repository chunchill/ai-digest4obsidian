# Follow Builders Sync 安装与配置指南

本文档用于在本地 Obsidian 仓库中手动安装和测试 `Follow Builders Sync` 插件。

## 功能说明

这个插件会从 Follow Builders 的公开中央 feed 同步原始内容到 Obsidian：

- X/Twitter builder posts
- Podcast episodes
- Blog posts

插件还会生成一份按日期聚合的 deterministic daily digest。它不生成 AI 摘要，不需要 OpenAI API key，也不需要本地安装 `follow-builders` 项目。

## 构建插件

在本项目目录运行：

```bash
npm install
npm run build
```

构建成功后，用于安装的核心文件是：

```text
manifest.json
main.js
```

当前插件没有 `styles.css`，所以不需要复制样式文件。

## 手动安装到 Obsidian

假设你的 Obsidian vault 路径是：

```text
/path/to/your/vault
```

创建插件目录：

```bash
mkdir -p "/path/to/your/vault/.obsidian/plugins/follow-builders-sync"
```

复制插件文件：

```bash
cp manifest.json main.js "/path/to/your/vault/.obsidian/plugins/follow-builders-sync/"
```

如果你在本仓库的隔离工作区中测试，命令示例为：

```bash
cd /Users/jasper.qiu/Projects/ai-labs/ai-digest4obsidian/.worktrees/follow-builders-sync
mkdir -p "/path/to/your/vault/.obsidian/plugins/follow-builders-sync"
cp manifest.json main.js "/path/to/your/vault/.obsidian/plugins/follow-builders-sync/"
```

## 在 Obsidian 中启用

1. 打开 Obsidian。
2. 打开目标 vault。
3. 进入 `Settings` -> `Community plugins`。
4. 如果尚未启用 Community plugins，先启用。
5. 在已安装插件列表中找到 `Follow Builders Sync`。
6. 启用插件。

如果插件没有出现，重启 Obsidian，或确认目录名和 manifest id 都是：

```text
follow-builders-sync
```

## 插件配置

进入 `Settings` -> `Community plugins` -> `Follow Builders Sync` 的设置页。

可配置项：

- `Target folder`：同步内容写入的根目录，默认 `Follow Builders`。
- `Sync X posts`：是否同步 X/Twitter 内容。
- `Sync podcasts`：是否同步播客内容。
- `Sync blogs`：是否同步博客内容。
- `Write daily digest`：为每个同步日期创建或更新一份 `Daily/YYYY-MM-DD.md` 聚合笔记。默认开启。
- `Overwrite existing files`：是否覆盖已有 Markdown 文件。默认关闭。
- `Clear sync history`：清除已同步 ID 记录。不会删除已经写入的 Markdown 文件。

建议首次测试保持默认配置。

## 执行同步

有两种方式：

1. 点击 Obsidian 左侧 Ribbon 中的同步图标。
2. 打开命令面板，运行 `Sync Follow Builders feeds`。

首次同步会导入当前中央 feed 中可见的所有内容。后续同步会根据已同步 ID 和已有文件跳过重复内容。

## 输出目录结构

默认输出结构如下：

```text
Follow Builders/
  Daily/
    2026-05-25.md
  2026-05-25/
    x-example-123.md
    podcast-example-title.md
    blog-example-title.md
```

`Daily/2026-05-25.md` 是当天内容的聚合笔记；如果当天有对应内容，会包含 podcasts、X/Twitter、blogs 等分区。它只基于中央 feed 中已抓取的字段进行确定性整理，不是 AI 生成摘要。

每条内容会生成一个 Markdown 文件，包含：

- frontmatter
- 原始链接
- 作者或来源
- 原始正文或可用标题
- 可用 metadata

## 网络要求

插件需要访问 GitHub Raw 上的 Follow Builders 公共 feed：

```text
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json
```

如果同步失败，请先确认当前网络可以访问这些地址。

## 更新插件

重新构建并复制文件：

```bash
npm run build
cp manifest.json main.js "/path/to/your/vault/.obsidian/plugins/follow-builders-sync/"
```

然后在 Obsidian 中重新加载插件，或重启 Obsidian。

## 故障排查

- 插件没有出现在列表中：确认复制了 `manifest.json` 和 `main.js`，且插件目录名是 `follow-builders-sync`。
- 点击同步后没有文件：确认目标 folder 配置有效，并检查同步 Notice 是否显示 feed 访问失败。
- 重复同步没有新增文件：这是正常行为，插件会跳过已同步内容。
- 想重新导入：点击 `Clear sync history`，必要时删除已生成的 Markdown 文件，再重新同步。
