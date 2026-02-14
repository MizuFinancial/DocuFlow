# DocuFlow (基于 Markdown 的自动化文档生成工具)

## 1. 产品背景与定义 (Background & Definition)

### 1.1 背景

传统的软件产品文档维护是一个痛点：

* **截图易过期**：产品 UI 迭代快，文档中的截图往往在两周后就与实际界面不符。
* **维护成本高**：手动截图、录屏、上传、替换链接的过程繁琐且容易出错。
* **缺乏联动**：文档与测试分离，文档写得再好也无法验证产品功能是否正常。

### 1.2 产品定义

**DocuFlow** 是一个轻量级的文档生成工具。它允许用户在 Markdown 文件中嵌入一种简洁的**DSL（领域特定语言）脚本**。
解析器读取 Markdown，提取脚本，通过 Playwright 驱动浏览器执行操作，自动捕获截图或视频，并将生成的媒体资源链接回填到 Markdown 中。

### 1.3 核心价值

* **单一数据源 (Single Source of Truth)**：文档即脚本，修改脚本即更新文档。
* **自动化**：一键生成最新 UI 的截图和视频。
* **低门槛**：使用类自然语言的 DSL，无需精通 Node.js 或 Playwright API。

---

## 2. 使用指南 (Usage Guide)

### 2.1 安装与设置 (Installation & Setup)

DocuFlow 依赖 Playwright 驱动浏览器。请确保已安装 Node.js (>=18)。

#### 方式一：全局安装 (Global Installation)

```bash
# 全局安装
npm install -g @mizufinancial/docuflow

# 初始化 Playwright 环境 (只需执行一次)
npx playwright install chromium
```

#### 方式二：项目内安装 (Local Installation)

```bash
# 安装到 devDependencies
pnpm add -D @mizufinancial/docuflow

# 安装 Playwright 浏览器
pnpm exec playwright install chromium
```

### 2.2 编写文档 (Writing Documentation)

在 Markdown 文件中，使用 `flow` 语言标识符编写自动化脚本代码块。详细语法请参考 [DSL 规范文档](./DSL_SPEC.md)。

**示例：**

````markdown
# 我的功能文档

这里展示首页截图：

```flow
# 配置浏览器视口
config viewport 1280x720

# 访问页面
goto https://example.com

# 截图并保存为 example.png
snapshot example.png
```
````

### 2.3 生成文档 (Generate Documentation)

运行以下命令扫描并处理 Markdown 文件。

```bash
# 使用 npx 运行
npx docuflow

# 或者在 package.json 中配置脚本后运行
pnpm start
```

**输出说明：**
工具不会修改原文件，而是生成名为 `[filename]-done.md` 的新文件：
*   移除所有 `flow` 代码块。
*   在原位置插入生成的截图或视频。
*   文件头部添加 YAML Metadata（元数据）。

### 2.4 查看示例 (Examples)

你可以参考以下示例文档：
- [Mizu 官网介绍](./mizu/homepage.md): 包含桌面端/移动端截图和交互录屏。
- [测试用例](./TESTING.md): 包含基础流程、组件截图和深色模式测试。
