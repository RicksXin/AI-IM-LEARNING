# Conversation Playground AI 协作流程汇报

日期：2026-05-21

## 一、背景

本次任务从一句「在 playground 里做一个简单的网络请求单元，叫做 conversation」开始，最终落到 React Native playground 中的一个可运行、可配置、可测试、可展示的会话列表模块。

整个过程中，用户主要通过聊天提出目标、补充约束和截图参考；AI 负责识别技术栈、澄清关键歧义、选择实现方案、编写代码、补测试、验证结果，并给出 iOS 模拟器运行说明。

## 二、最终产出

### 1. 请求单元

在 `client/flash_im/src/playground/conversation` 下新增 conversation 模块：

- `entities/Conversation.ts`：会话实体类，负责从后端 JSON 映射到前端对象。
- `config/conversationApiConfig.ts`：请求配置，支持 `host`、`port`、`baseURL`、`timeoutMs`，用于解决本地 IP 可能变化的问题。
- `request/createConversationHttpClient.ts`：基于 `axios` 创建请求 client。
- `api/ConversationApi.ts`：会话接口层，封装 `/conversation` 请求。
- `index.ts`：模块统一导出。

### 2. 会话视图层

根据截图实现接近微信会话页的视图结构，并拆分组件：

- `cases/ConversationPlayground.tsx`：容器组件，只负责请求状态、配置和刷新逻辑。
- `conversation/view/ConversationScreen.tsx`：页面组合层。
- `conversation/view/ConversationHeader.tsx`：顶部标题、返回、刷新。
- `conversation/view/ConversationConnectionPanel.tsx`：playground 联调配置条。
- `conversation/view/ConversationList.tsx`：会话列表。
- `conversation/view/ConversationListItem.tsx`：单条会话行。
- `conversation/view/ConversationAvatar.tsx`：头像展示。
- `conversation/view/ConversationTabBar.tsx`：底部 tab 栏。
- `conversation/data/previewConversations.ts`：后端未启动时的预览数据。

### 3. 测试覆盖

新增和更新测试：

- `__tests__/conversationApi.test.ts`：覆盖 baseURL 配置、axios client 配置、实体映射、接口请求和异常响应。
- `__tests__/conversationView.test.tsx`：覆盖视图层关键内容与刷新行为。
- `__tests__/PlaygroundApp.test.tsx`：确保 playground 首页暴露 conversation 入口。

### 4. 运行入口

iOS DEBUG 入口已切换为 `index.playground`，方便在 iOS 模拟器直接查看 playground 效果。

## 三、关键流程点

### 1. 先识别技术栈，而不是直接套用用户词汇

用户最初提到「使用 dio 库」。AI 没有直接照做，而是先检查仓库：

- 当前客户端是 React Native + TypeScript。
- 后端是 Go。
- 仓库中没有 Flutter/Dart 工程。
- `dio` 属于 Dart/Flutter 生态，不适合直接用于当前 RN 客户端。

这个步骤避免了错误引入不匹配的技术栈。随后 AI 解释了：

- Flutter/Dart 中常用 `dio`。
- Go 中常用 `net/http` 或框架的 HTTP 能力。
- React Native 中更适合使用 `fetch` 或 `axios`。

用户确认后，最终选择 `axios`。

### 2. 先看现有结构，再决定落点

AI 先读取了现有文件：

- `src/playground/PlaygroundApp.tsx`
- `src/playground/PlaygroundHome.tsx`
- `src/playground/cases/FireworksPlayground.tsx`
- `__tests__/PlaygroundApp.test.tsx`
- `server/main.go`
- `server/main_test.go`
- `package.json`

由此确认：

- playground 已经是独立入口。
- 当前已有案例组织方式是 `src/playground/cases`。
- 后端已有 `GET /conversation` 接口，返回 `title`、`lastMsg`、`time`。
- 测试使用 Jest 和 `react-test-renderer`。

因此 conversation 没有被写成零散 demo，而是按现有项目的入口、案例和测试习惯接入。

### 3. 请求层和视图层分离

本次实现刻意把网络请求与 UI 展示拆开：

- 实体层只关心数据结构。
- 配置层只关心请求地址如何生成。
- request 层只关心 axios client 如何创建。
- api 层只关心接口路径和响应映射。
- playground 容器只关心页面状态。
- view 层只关心展示。

这样做的好处是：

- 接口请求可以脱离页面单独测试。
- IP 和端口变化时不用改业务代码。
- 后续从 playground 迁移到正式页面时，可以复用实体层、配置层、请求层和大部分视图层。
- UI 继续迭代时，不会影响接口封装。

### 4. 用依赖注入保证接口可独立测试

`ConversationApi` 支持注入 `client`：

```ts
const api = new ConversationApi({ client });
```

测试中可以传入假的 `client.get`，不需要真实启动后端，也不需要真实网络环境。

这保证了：

- API 层测试稳定。
- 网络失败不会影响单元测试。
- 可以精确断言请求路径是 `/conversation`。
- 可以单独验证后端响应到实体对象的映射逻辑。

### 5. 先做可联调，再做接近截图的体验

第一版 conversation 页面偏请求调试：

- 可输入 Host/IP。
- 可输入 Port。
- 可点击按钮请求列表。
- 可看到成功或失败结果。

在用户给出截图后，AI 将视图重构为接近微信会话页：

- 白底列表。
- 左侧头像。
- 标题、摘要、时间。
- 底部 tab。
- 微信 tab 高亮。
- 发现 tab 红点。

同时保留了 playground 的联调能力，把 Host/IP 和 Port 放在顶部配置条中。这兼顾了「好看」和「能调接口」。

### 6. 每个阶段都做验证

实现过程中使用了多层验证：

- 局部 Jest：只跑 conversation API、view 和 playground 入口测试。
- 全量 Jest：确认其它测试没有被破坏。
- TypeScript：`npx tsc --noEmit`。
- ESLint：`npm run lint`。
- `npm audit --omit=dev`：识别依赖安全提示。

最终结果：

- 5 个测试套件通过。
- 13 个测试通过。
- TypeScript 检查通过。
- ESLint 通过。

`npm audit` 仍报告 7 个 moderate，来源是 React Native CLI 依赖链，不是 conversation 请求层新增逻辑本身。

## 四、AI 协作模式总结

这次流程体现了一个比较完整的 AI 开发闭环：

1. 用户描述目标。
2. AI 检查项目上下文。
3. AI 识别关键歧义：`dio` 与当前 RN 技术栈不匹配。
4. AI 解释技术选型，并等待用户确认。
5. 用户确认使用 `axios`。
6. AI 安装依赖。
7. AI 分层实现请求单元。
8. AI 编写独立测试。
9. AI 接入 playground UI。
10. 用户提供截图。
11. AI 根据截图重构视图层。
12. AI 保持请求层、容器层、视图层分离。
13. AI 运行测试、类型检查和 lint。
14. AI 给出 iOS 模拟器运行方式。

用户的参与方式主要是：

- 提出目标。
- 确认技术方向。
- 提供视觉参考。
- 询问运行方式。

AI 的职责是：

- 找上下文。
- 判断技术栈。
- 做方案取舍。
- 编码实现。
- 自测验证。
- 汇报结果。

这说明从 0 到 1 的功能搭建不一定需要用户逐条写需求，只要用户能持续对话、确认方向和提供关键参考，AI 可以承担大部分工程执行工作。

## 五、可复用经验

### 1. 遇到技术名词先确认生态

例如 `dio` 这种词，在不同技术栈下可能产生误解。正确做法不是马上安装，而是先确认当前项目语言、平台和已有依赖。

### 2. playground 功能也要有边界

即使只是 playground，也应保持：

- 数据实体独立。
- 请求配置独立。
- 请求 client 独立。
- API 层独立。
- UI 层独立。

这会让 demo 代码具备迁移价值，而不是一次性代码。

### 3. 请求代码最好天然可测

通过注入 HTTP client，可以把真实网络从单元测试中拿掉。这样既能测试接口封装，也能保持测试速度和稳定性。

### 4. 视觉实现应二次拆分

截图驱动 UI 时，不应把所有样式写进一个页面。更好的方式是按视觉单位拆分：

- header
- connection panel
- list
- list item
- avatar
- tab bar

这样后续替换图标、加未读数、加点击事件都会更容易。

### 5. AI 不只是写代码，也要负责验证

本次每个重要阶段都通过命令验证，最终交付的不只是「代码写完」，而是「代码能跑、测试能过、结构清楚」。

## 六、后续建议

### 1. 增加 iOS playground 启动脚本

当前 iOS DEBUG 入口已切到 `index.playground`，但更好的方式是增加类似 Android 的 playground 启动参数或 scheme，避免手动改 Swift 文件。

### 2. 增加真实头像字段

后端当前 conversation 只有 `title`、`lastMsg`、`time`。如果要更接近真实 IM，可以增加：

- `id`
- `avatarUrl`
- `unreadCount`
- `isMuted`
- `isPinned`

### 3. 增加正式首页迁移路径

当 conversation 模块稳定后，可以将请求层和视图层迁移到正式 `src/features/conversation` 或类似目录，playground 保留为演示与联调用例。

### 4. 增加网络状态展示

后续可以补充：

- 首次加载状态。
- 下拉刷新。
- 空列表状态。
- 请求失败重试。
- 弱网超时提示。

这些都可以在不破坏现有分层的基础上继续扩展。
