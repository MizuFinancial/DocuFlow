# DocuFlow DSL Specification

## 1. 语法规范 (Syntax Specification)

### 1.1 宿主环境

DSL 寄宿于标准的 Markdown Code Block（代码块）中。为了区分普通代码和 DocuFlow 脚本，我们定义特定的语言标识符：`flow`。

### 1.2 基本结构

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

### 1.3 解析规则
1.  **忽略大小写**：命令名不区分大小写（建议全小写）。
2.  **注释**：以 `#` 开头的行被视为注释。
3.  **参数分隔**：使用空格分隔。如果参数包含空格（如输入的文本），必须使用双引号 `""` 包裹。
4.  **上下文保持**：同一个 Markdown 文件中的多个 `flow` 代码块共享同一个浏览器 Context（除非显式重置）。这意味着代码块 A 登录后，代码块 B 依然处于登录状态。

---

## 2. 语法元素与控制器 (Syntax Elements & Controllers)

### 2.1 配置类 (Config)
用于初始化环境或改变浏览器状态。

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `config viewport` | `width`x`height` | 设置视口大小 | `page.setViewportSize()` |
| `config device` | `DeviceName` | 模拟特定设备 | `playwright.devices['iPhone 13']` |
| `config theme` | `light` \| `dark` | 设置深色/浅色模式 | `page.emulateMedia({ colorScheme: ... })` |

### 2.2 导航类 (Navigation)
控制页面跳转。

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `goto` | `url` | 跳转到相对或绝对路径 | `page.goto(url)` |
| `reload` | - | 刷新页面 | `page.reload()` |
| `goBack` | - | 浏览器后退 | `page.goBack()` |

### 2.3 交互类 (Interaction)
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

### 2.4 流程控制与等待 (Flow & Wait)
为了保证截图时页面已加载完毕。

| 命令 | 参数格式 | 说明 | 映射 Playwright 逻辑 |
| :--- | :--- | :--- | :--- |
| `wait time` | `Milliseconds` | 强制等待时长 | `page.waitForTimeout(ms)` |
| `wait selector` | `Selector` | 等待元素出现 | `page.waitForSelector(selector)` |
| `wait url` | `UrlPart` | 等待 URL 包含某字符串 | `page.waitForURL(pattern)` |

### 2.5 输出类 (Output)
这部分指令不操作浏览器，而是生成文件并修改 Markdown AST。

| 命令 | 参数格式 | 说明 | 动作 |
| :--- | :--- | :--- | :--- |
| `snapshot` | `FileName` | 截取当前视口 | `page.screenshot()`, 保存文件, **在 AST 中插入 `![]()`** |
| `snapshot element` | `Selector` `FileName` | 仅截取特定组件 | `locator.screenshot()`, 保存, 插入 MD |
| `record start` | - | 开始录屏 | `browser.newContext({ recordVideo: ... })` |
| `record stop` | - | 停止录屏并保存 | 关闭 Context, 保存视频, 插入 MD |
