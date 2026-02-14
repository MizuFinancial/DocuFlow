# Testing Guide

## 测试用例 (Test Cases)

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
