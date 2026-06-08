# Follow Builders Sync 安装与配置指南

本文档用于在本地 Obsidian vault 中安装和测试 `Follow Builders Sync` 插件。

## 功能说明

这个插件会从 Follow Builders 的公开中央 feed 同步内容，并在 Obsidian 中生成按日期命名的 digest 笔记：

- X/Twitter builder posts
- Podcast episodes
- Blog posts

每份 digest 会聚合当天抓取到的内容。插件不生成 AI 摘要，不需要 OpenAI API key，也不需要本地安装 `follow-builders` 项目。

## 从 Release 包安装

在 GitHub 的 **Releases** 页面下载 `follow-builders-sync-<version>.zip` 资产文件，不要下载 tag 页面自动生成的 `Source code (zip)`。源码包包含 `src/`、`tests/` 等开发文件，安装脚本位于 `scripts/install-to-vault.sh`，与 release 包目录结构不同。

下载 release zip，解压后在解压目录中运行：

```bash
bash install-to-vault.sh "/path/to/your/vault"
```

安装脚本会把插件文件复制到：

```text
/path/to/your/vault/.obsidian/plugins/follow-builders-sync/
```

release 包包含：

```text
manifest.json
main.js
install-to-vault.sh
README.md
docs/INSTALL.en.md
docs/INSTALL.zh-CN.md
```

如果后续版本加入 `styles.css`，安装脚本会在文件存在时自动复制。

## 从源码构建

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

## 从源码运行安装脚本

源码构建完成后运行：

```bash
bash scripts/install-to-vault.sh "/path/to/your/vault"
```

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

建议首次测试保持默认配置。

## 执行同步

有两种方式：

1. 点击 Obsidian 左侧 Ribbon 中的同步图标。
2. 打开命令面板，运行 `Sync Follow Builders feeds`。

每次同步都会读取当前中央 feed 中可见的内容，并为本次 fetch 中出现的日期创建或更新 digest 笔记。

## 输出目录结构

默认输出结构如下：

```text
Follow Builders/
  2026-05-25.md
  2026-05-26.md
```

每个 `YYYY-MM-DD.md` 文件都是当天内容的聚合笔记；如果当天有对应内容，会包含 podcasts、X/Twitter、blogs 等分区。它只基于中央 feed 中已抓取的字段进行确定性整理，不是 AI 生成摘要。

每份 digest 笔记包含：

- frontmatter
- 来源分区
- 来源名或作者
- 基于已抓取内容的摘录
- 每条内容的原始链接

## 网络要求

插件需要访问 GitHub Raw 上的 Follow Builders 公共 feed：

```text
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json
```

如果同步失败，请先确认当前网络可以访问这些地址。

## 更新插件

如果使用 release 包，解压新版本后重新运行：

```bash
bash install-to-vault.sh "/path/to/your/vault"
```

如果使用源码安装，重新构建并运行源码安装脚本：

```bash
npm run build
bash scripts/install-to-vault.sh "/path/to/your/vault"
```

然后在 Obsidian 中重新加载插件，或重启 Obsidian。

## 构建 Release 包

维护者可以用下面的命令生成用于发布的 zip：

```bash
npm run package
```

生成的文件会写入 `dist/`，并包含位于 zip 根目录的 `install-to-vault.sh` 安装脚本。

## 故障排查

- 插件没有出现在列表中：确认复制了 `manifest.json` 和 `main.js`，且插件目录名是 `follow-builders-sync`。
- 安装脚本提示 `Vault directory does not exist`：请传入 vault 根目录，不是 `.obsidian` 目录。
- 点击同步后没有文件：确认目标 folder 配置有效，并检查同步 Notice 是否显示 feed 访问失败。
- 重复同步没有新增日期文件：这是正常行为；如果 feed 中仍是相同日期，已有 digest 笔记会被更新。
- 想重新生成：删除已生成的 digest Markdown 文件，再重新同步。
