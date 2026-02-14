# DocuFlow Test Cases

## Case 1: 基础流程与全页截图 (The Happy Path)

**目标**：验证导航、输入、点击、全页截图功能。

```flow
config viewport 1280x800
goto https://saucedemo.com
fill #user-name "standard_user"
fill #password "secret_sauce"
click #login-button
wait url **/inventory.html
snapshot login_success.png
```

![Snapshot](login_success.png)

## Case 2: 组件级截图与深色模式 (Component & Theme)

**目标**：验证配置切换、元素定位截图。

```flow
goto https://playwright.dev
config theme dark
# 仅截取“Get Started”按钮
snapshot element ".getStarted_Sjon" dark_mode_btn.png
```

![Element Snapshot](dark_mode_btn.png)

## Case 3: 录屏功能 (Video Recording)

**目标**：验证视频录制流。

```flow
record start
goto https://example.com
click a
wait time 1000
record stop demo_video.webm
```

<video src="demo_video.webm" controls width="100%"></video>
