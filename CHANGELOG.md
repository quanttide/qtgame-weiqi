# CHANGELOG

## [0.1.0] - 2026-06-27

## [v0.1.0]

### Added
- 围棋棋盘游戏初始实现
- 添加 .gitignore 排除 node_modules
- 添加 Apache 2.0 许可证
- 新增 design-language.md：布局原则
- 添加 design/product/architecture SKILL 文件

### Changed
- 清理未使用的 lint-staged 配置
- 五项优化：圆点指示、选中态强化、按钮层级、Pass图标、棋谱导航
- 重构右侧控制台：信息对比 + 操作分层 + 紧凑棋谱
- 精简头部
- 两栏布局调整：棋盘占左1fr，右侧信息与棋谱集中
- 工具条移到棋盘上方，左右栏对称
- 重构棋盘组件分布：共享控制移入中栏，右栏仅保留白方信息
- 完善 README
- 默认输出路径改为 docs/dev/
- 将三个 SKILL 文件归入 product-blueprint 统一目录

### Fixed
- 修复键盘快捷键缺失大括号导致的 JS 语法错误

### Removed
- 移除状态栏
- 删除左栏规则说明
