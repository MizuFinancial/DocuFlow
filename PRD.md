# PRD: DocuFlow (基于 Markdown 的自动化文档生成工具)

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

## 2. 语法规范 (Syntax Specification)

### 2.1 宿主环境

DSL 寄宿于标准的 Markdown Code Block（代码块）中。为了区分普通代码和 DocuFlow 脚本，我们定义特定的语言标识符：`flow`。

### 2.2 基本结构

每一行代表一个原子操作指令。
格式遵循：`[动词/命令] [目标/参数] [可选值/选项]`

**示例：**

````markdown
# 用户登录流程

下面展示用户登录的操作步骤：

```flow
# 这里是注释：设置浏览器尺寸
config viewport 1280x720

# 导航
goto /login
snapshot login.png

# 交互
fill #username "admin"
fill #password "secret123"
click "登录"

# 等待页面跳转
wait url /dashboard

# 截图并保存为 assets/dashboard.png，自动插入到文档中
snapshot dashboard.png

```
````

### 2.3 解析规则
1.  **忽略大小写**：命令名不区分大小写（建议全小写）。
2.  **注释**：以 `#` 开头的行被视为注释。
3.  **参数分隔**：使用空格分隔。如果参数包含空格（如输入的文本），必须使用双引号 `""` 包裹。
4.  **上下文保持**：同一个 Markdown 文件中的多个 `flow` 代码块共享同一个浏览器 Context（除非显式重置）。这意味着代码块 A 登录后，代码块 B 依然处于登录状态。

---

## 3. 语法元素与控制器 (Syntax Elements & Controllers)

我们需要实现以下核心指令集。

### 3.1 配置类 (Config)
用于初始化环境或改变浏览器状态。

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `config viewport` | `width`x`height` | 设置视口大小 | `page.setViewportSize()` |
| `config device` | `DeviceName` | 模拟特定设备 | `playwright.devices['iPhone 13']` |
| `config theme` | `light` \| `dark` | 设置深色/浅色模式 | `page.emulateMedia({ colorScheme: ... })` |

### 3.2 导航类 (Navigation)
控制页面跳转。

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `goto` | `url` | 跳转到相对或绝对路径 | `page.goto(url)` |
| `reload` | - | 刷新页面 | `page.reload()` |
| `goBack` | - | 浏览器后退 | `page.goBack()` |

### 3.3 交互类 (Interaction)
这是最复杂的各类，需要智能的“目标选择器”。
*注意：`Selector` 可以是 CSS 选择器（如 `#id`），也可以是文本内容（如 `"提交"`）。解析器应尝试智能识别。*

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `click` | `Selector` | 点击元素 | `page.click(selector)` 或 `page.getByText().click()` |
| `fill` | `Selector` `Value` | 在输入框填入文本 | `page.fill(selector, value)` |
| `type` | `Text` | 模拟键盘敲击（非填充） | `page.keyboard.type(text)` |
| `press` | `Key` | 按下特定键 (如 Enter) | `page.keyboard.press(key)` |
| `hover` | `Selector` | 鼠标悬停 | `page.hover(selector)` |
| `check` | `Selector` | 勾选 Checkbox | `page.check(selector)` |

### 3.4 流程控制与等待 (Flow & Wait)
为了保证截图时页面已加载完毕。

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `wait time` | `Milliseconds` | 强制等待时长 | `page.waitForTimeout(ms)` |
| `wait selector` | `Selector` | 等待元素出现 | `page.waitForSelector(selector)` |
| `wait url` | `UrlPart` | 等待 URL 包含某字符串 | `page.waitForURL(pattern)` |

### 3.5 输出类 (Output) - **核心功能**
这部分指令不操作浏览器，而是生成文件并修改 Markdown AST。

| 命令 | 参数格式 | 说明 | 动作 |
| :--- | :--- | :--- | :--- |
| `snapshot` | `FileName` | 截取当前视口 | `page.screenshot()`, 保存文件, **在 AST 中插入 `![]()`** |
| `snapshot element` | `Selector` `FileName` | 仅截取特定组件 | `locator.screenshot()`, 保存, 插入 MD |
| `record start` | - | 开始录屏 | `browser.newContext({ recordVideo: ... })` |
| `record stop` | - | 停止录屏并保存 | 关闭 Context, 保存视频, 插入 MD |

---

## 4. 逻辑实现流程 (Implementation Logic)

开发时需遵循以下伪代码流程：

1.  **Pre-process**: 扫描整个项目目录下的 `.md` 文件。
2.  **Parse**: 使用 `unified` / `remark` 将 Markdown 转为 AST。
3.  **Detect**: 遍历 AST，寻找 `lang === 'flow'` 的 Code 节点。
4.  **Translate**: 将 DSL 文本行解析为 Playwright 的操作对象队列。
    * *例如*: `click "Login"` -> `{ action: 'click', target: 'text=Login' }`
5.  **Execute**:
    * 启动 Playwright Browser。
    * 按顺序执行操作队列。
    * 遇到 `snapshot` 时，将文件写入磁盘（如 `./docs/images/login.png`）。
6.  **Inject**:
    * 在当前 Code Block 节点的**紧邻下方**，检查是否已经存在该图片的引用。
    * 如果不存在，插入一个新的 Image 节点 `![Snapshot](./images/login.png)`。
    * 如果已存在，更新其路径（如果文件名变了）。
7.  **Write**: 将修改后的 AST 转回 Markdown 文本并覆盖原文件。

---

## 5. 测试用例 (Test Cases)

为了验证工具的可用性，我们需要构建以下三个场景的 Markdown 文件进行测试。

### Case 1: 基础流程与全页截图 (The Happy Path)
**目标**：验证导航、输入、点击、全页截图功能。

````markdown
# 测试用例 1：登录

```flow
config viewport 1280x800
goto [https://saucedemo.com](https://saucedemo.com)  # 使用公开的测试网站
fill #user-name "standard_user"
fill #password "secret_sauce"
click #login-button
wait url /inventory.html
snapshot login_success.png
```
````

**预期结果**：Markdown 文件中自动出现一张展示商品列表的 `login_success.png` 图片。

### Case 2: 组件级截图与深色模式 (Component & Theme)
**目标**：验证配置切换、元素定位截图。

````markdown
# 测试用例 2：组件展示

```flow
goto [https://playwright.dev](https://playwright.dev)
config theme dark
# 仅截取“Get Started”按钮
snapshot element ".getStarted_Sjon" dark_mode_btn.png
```
````

**预期结果**：生成一张仅包含按钮的深色模式截图。

### Case 3: 录屏功能 (Video Recording)
**目标**：验证视频录制流。

````markdown
# 测试用例 3：操作演示

```flow
record start
goto [https://example.com](https://example.com)
click "More information..."
wait time 1000
record stop demo_video.webm
```
````

**预期结果**：Markdown 中出现 `<video src="demo_video.webm" ...>` 标签或对应的视频链接。
