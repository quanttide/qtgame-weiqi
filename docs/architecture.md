# 架构 SKILL · 技术架构描述

> 目标文件：`src/index.html` — 墨弈围棋

---

## 1. 架构概览

**架构风格**：单体 SPA（Single-Page Application），所有代码在一个 HTML 文件中。

```
┌──────────────────────────────────────────────────┐
│                    index.html                      │
│  ┌──────────────────────────────────────────────┐ │
│  │  HTML 展示层                                  │ │
│  │  (Tailwind 布局 + 语义化标签 + 面板/按钮/...)  │ │
│  ├──────────────────────────────────────────────┤ │
│  │  CSS 样式层                                   │ │
│  │  (CSS 变量 + Tailwind + 内联样式 + 动画)      │ │
│  ├──────────────────────────────────────────────┤ │
│  │  JavaScript 逻辑层                            │ │
│  │  (Canvas 渲染 + 围棋规则 + 事件绑定 + UI 更新) │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**外部依赖**：

| 依赖 | 用途 | 加载方式 |
|------|------|---------|
| Tailwind CSS v3 (CDN) | 布局与响应式工具类 | `<script src="https://cdn.tailwindcss.com">` |
| Google Fonts | ZCOOL XiaoWei + Noto Sans SC 字体 | `<link href="...">` |

> 注意：依赖通过 CDN 加载，无离线可用保障。Tailwind 仅在构建时扫描 HTML 类名，无 Tree-shaking。

---

## 2. 组件关系与技术栈

| 模块 | 职责 | 技术选型 | 依赖关系 |
|------|------|---------|---------|
| **HTML 模板** | 页面结构声明、语义化标签、Tailwind 类名布局 | HTML5 + Tailwind 工具类 | 引入 CSS 样式层和 JS 逻辑层 |
| **CSS 样式** | 主题变量、面板质感、装饰效果、动画 | CSS 自定义属性 + 内联样式 + `@keyframes` | 无外部依赖 |
| **Canvas 渲染引擎** | 棋盘背景（木纹）、网格线、星位、棋子绘制、标记 | Canvas 2D API（`ctx.fillRect`、`arc`、`RadialGradient`） | 依赖全局 `board` 状态 |
| **围棋规则引擎** | 落子合法性、气/提子/劫争判定 | 纯 JS 函数（`getGroup`、`getNeighbors`、`placeStone`） | 无外部依赖，纯函数实现 |
| **状态管理** | 棋盘状态、历史栈、玩家/提子/手数计数 | 全局 `let` 变量 + 数组 `history` 快照 | 围棋规则引擎读写 |
| **事件系统** | 鼠标/触摸/键盘交互绑定 | 原生 `addEventListener` | 调用 Canvas 渲染 + 规则引擎 |
| **UI 更新** | 统计数据刷新、棋谱渲染、Toast | DOM API（`textContent`、`innerHTML`、`classList.toggle`） | 依赖状态管理 |
| **画动画系统** | 落子弹性动画 | `requestAnimationFrame` + 时间插值 | 调用 Canvas 渲染 |

**模块间通信方式**：全局变量 + 直接函数调用。无事件总线、无发布订阅、无状态管理库。

---

## 3. 数据流与状态管理

### 状态变更路径

```
用户操作（click / touch / keydown）
    ↓
事件处理器（canvas.addEventListener / button.addEventListener）
    ↓
规则引擎（placeStone / undo / pass / initBoard）
    ↓
状态更新（全局变量重新赋值：board, currentPlayer, history, ...）
    ↓
动画触发（requestAnimationFrame → animateFrame → draw → drawStone）
    ↓  +  直接调用
UI 更新（updateUI → DOM 元素 textContent / innerHTML 更新）
    ↓
Canvas 重绘（draw → 清空 → 木纹 → 网格 → 星位 → 坐标 → 劫争标记 → 棋子 → 最后一手 → 悬停预览）
```

### 核心数据结构

```typescript
// 棋盘状态
board: number[][]         // SIZE×SIZE 二维数组, 0=空 1=黑 2=白

// 游戏状态（全局变量）
currentPlayer: 1 | 2      // 当前执棋方
lastMove: { x, y, color } | null  // 最后一手位置
koPoint: { x, y } | null  // 劫争禁着点
blackCaptured: number     // 黑方提子数
whiteCaptured: number     // 白方提子数
blackMoves: number        // 黑方手数
whiteMoves: number        // 白方手数

// 历史栈
history: Array<{
  board: number[][]
  currentPlayer: number
  lastMove: { x, y, color } | null
  koPoint: { x, y } | null
  blackCaptured: number
  whiteCaptured: number
  blackMoves: number
  whiteMoves: number
  moveRecord: Array<{ player: number, notation: string }>
}>

// 棋谱记录
moveRecord: Array<{ player: number, notation: string }>
  // notation 格式: "B/A1" | "W/A1" | "BPass" | "WPass"

// 动画状态
animatingMove: { x, y, color, startTime: number } | null
hoverPos: { x, y } | null  // 鼠标悬停位置
```

### 持久化策略

**当前无持久化**。所有状态存储在内存全局变量中，页面刷新即丢失。

> ponytail: 无持久化适合当前"打开即下"场景。如需持久化，最简方案：每次 `history.push` 时同步写 `localStorage.setItem('weiqi-state', JSON.stringify(...))`，`initBoard` 时从中恢复。

---

## 4. 架构决策记录 (ADR)

### ADR-1：全局变量 vs 状态管理库

- **上下文**：一个单文件应用需要管理棋盘、玩家、历史、动画等多种状态
- **方案**：纯全局 `let` 变量，无框架
- **理由**：状态数量和复杂度有限（~12 个变量），引入 Redux/Zustand 反而增加体积和认知负担
- **后果**：状态变更缺少约束，任何函数都可以直接修改全局变量，调试时需人工追踪
- **替代方案**：考虑过模块模式（IIFE 闭包），但单文件下无实际好处

### ADR-2：Canvas 2D vs DOM 渲染

- **上下文**：需要绘制 361 个交叉点的网格、棋子、标记、动画
- **方案**：Canvas 2D API 全量绘制
- **理由**：每一帧都重绘所有内容（`draw()` 函数），实现简单；无需维护 DOM 节点与数据同步；棋子渐变动画 Canvas 原生支持
- **后果**：每次交互都全量重绘（~1000+ 次 Canvas API 调用），交互频次低（每次落子/移动），无性能问题
- **替代方案**：DOM 方式（每个交叉点一个 `<div>`）+ CSS 过渡，在 19×19 下 DOM 节点数过多

### ADR-3：棋盘快照 vs 增量历史

- **上下文**：悔棋功能需要恢复到上任状态
- **方案**：每次落子前深拷贝完整棋盘 `board.map(row => [...row])` 存入 `history` 数组
- **理由**：19×19 的二维数组快照约 2KB，100 手历史仅 200KB，内存可忽略；实现简单无 bug
- **后果**：仅支持后退（undo），不支持前进（redo）
- **替代方案**：增量差异记录（只存落子/提子操作），需要时回放 — 实现复杂且容易出错

### ADR-4：Tailwind CDN vs 构建工具

- **上下文**：需要响应式布局和样式系统
- **方案**：Tailwind CDN Play CDN 版本，零构建
- **理由**：单 HTML 文件不需要构建工具链；Play CDN 在运行时扫描 DOM 生成样式
- **后果**：Tailwind 工具类只能在 JS 执行后生效，有轻微闪烁；无 Tree-shaking，CDN 加载 ~300KB CSS
- **替代方案**：手写 CSS + PostCSS 构建，或纯 CSS Grid/Flexbox

### ADR-5：`shift()` BFS vs 其他搜索

- **上下文**：`getGroup` 使用队列 BFS 搜索连通的棋串
- **方案**：用 `Array.shift()` 实现 BFS 队列，配合 `Set` 去重
- **理由**：围棋棋盘 <= 19×19，BFS 最多搜索 361 个节点，`shift()` 的 O(n) 重排在这么小规模下可忽略
- **后果**：理论上有更高效的队列实现（链表/索引指针），但不值得优化
- **替代方案**：DFS 递归 — 栈溢出风险；链表队列 — 过度工程

---

## 5. 性能与安全

### 性能策略

- **渲染优化**：Canvas 全量重绘，由于交互频率低（落子/悬停移动），无性能瓶颈
- **动画**：`requestAnimationFrame` 渲染，仅在 `animatingMove` 非空时驱动动画帧
- **加载**：Tailwind CDN + Google Fonts 外链加载，首次渲染依赖 CDN 响应
- **内存**：无大型数据结构，历史快照累积量可控

> ponytail: 如需性能优化，可考虑 Canvas 离屏缓冲区缓存棋盘网格背景，但当前每次重绘约 2ms，不值得提前优化。瓶颈预判：1000 手历史快照 ~2MB，仍可接受。

### 安全边界

| 维度 | 措施 |
|------|------|
| 输入验证 | 落子坐标范围检测 (`x < 0 || x >= SIZE`)、位置空检测、劫争检测、自杀检测 |
| 无远程数据 | 无用户输入传入后端、无 XHR/Fetch 调用 |
| 事件安全 | `e.target.tagName` 过滤键盘事件，避免输入框中触发快捷键 |
| 触摸事件 | `passive: false` 防止滚动与触屏冲突，`e.preventDefault()` 阻止缩放 |

### 监控与日志

**无**。当前无错误追踪或用户行为采集。
