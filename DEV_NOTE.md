# Developer Notes

## 逻辑实现流程 (Implementation Logic)

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
