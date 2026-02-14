# Mizu Financial 官网介绍

本文档展示了 Mizu Financial 官网 (<https://mizufinancial.com>) 的核心页面与响应式布局效果。

## 1. 桌面端首页 (Desktop Homepage)

Mizu Financial 的桌面端展示了清晰的品牌形象与核心服务。

```flow
# 配置桌面视口
config viewport 1440x900

# 访问官网
goto https://mizufinancial.com

# 等待页面加载（此处简单等待时间，也可以等待关键元素）
wait time 12000

# 截取全屏快照
snapshot mizu_desktop_home.png
```

## 2. 移动端视图 (Mobile View)

为了确保移动用户的体验，我们通过模拟 iPhone 设备来查看响应式效果。

```flow
# 模拟移动设备
config device "iPhone 13"

# 访问官网 (确保响应式适配)
goto https://mizufinancial.com

# 等待加载
wait time 2000

# 截取首屏
snapshot mizu_mobile_home.png
```

## 3. 页面交互演示 (Interaction Demo)

简单演示页面的滚动或交互流。

```flow
# 重置为桌面宽屏，开始录制
config viewport 1440x900
record start

goto https://mizufinancial.com
wait time 12000

# 模拟用户浏览：滚动页面
# Playwright 没有直接的 scroll 命令，但我们可以通过按键模拟
click body
press PageDown
wait time 1000
press PageDown
wait time 1000

# 停止录制并保存视频
record stop mizu_scroll_demo.webm
```
