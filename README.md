# Rainbow Bucket · 沙画消消消

复刻“沙画彩桶 / 传送带接沙”玩法的 HTML5 休闲游戏：点击彩色桶送上有限槽位的传送带，桶自动吸走沙画底层的同色沙，三个相邻同色小桶合成大桶，清空沙画通关。基于 Vite + Canvas 2D，支持手机与 PC。

## 运行

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm test           # 14 项规则/存档测试
npm run levels     # 确定性重新生成 36 关
npm run validate   # 逐关自动模拟通关
```

## 玩法规则

- 沙画每列**最底层沙粒**是当前可收集目标；桶只吸同色底沙，吸满后消失，上层沙粒下落。
- 三个相邻同色小桶自动合成容量三倍的大桶。
- 传送带槽位有限；槽位占满且无同色可吸时失败。
- 新增机制按难度层逐步引入：
  - **冻结沙粒**：带冰晶的沙粒需要两次同色吸沙才消失。
  - **封锁槽位**：部分槽位被锁，吸沙达到条件后自动解锁。
  - **桶预算**：部分关卡限制总放桶数，预算耗尽且无法继续吸沙即失败。
  - **隐藏目标**：大师层部分关卡要求“不合成通关”，达成后记录隐藏挑战。
- `Esc` 暂停/恢复；数字键 `1`~`4` 快速放置对应颜色桶。

## 难度分层（36 关）

| 层 | 关卡 | 机制 | 目标体验 |
| --- | --- | --- | --- |
| 教学 tutorial | 1~6 | 2~3 色、6~7 槽、慢节拍 | 学会基本操作 |
| 熟练 practice | 7~12 | 冻结沙粒 | 理解“多次吸沙”与节奏 |
| 策略 strategy | 13~20 | 4 色、5 槽、复杂沙画 | 规划合成与槽位 |
| 高压 pressure | 21~28 | 封锁槽位 → 桶预算 → 二者组合 | 资源与时机压力 |
| 大师 master | 29~36 | 冻结 + 封锁 + 预算 + 隐藏目标 | 综合挑战、探索欲 |

每个新机制先有 2 关单独教学，再进入组合关。关卡由 `scripts/generate-levels.mjs` 用固定种子生成，并由 `solver.js` 搜索放置序列验证可解；`validate-levels.mjs` 再用真实逻辑完整模拟。

## 即时反馈

- 沙画下方显示**底层颜色预告**（最多 3 色）。
- 空槽 ≤1 且无可吸颜色时，传送带红色脉冲 + 低沉提示音 + 节流 Toast。
- 已有两个相邻同色小桶时，第三格显示“可合成”虚影。
- 吸沙时沙粒带拖尾飞向桶；冻结沙粒有冰晶覆盖；解锁槽位有独立提示。
- 失败弹窗列出冲突颜色（传送带桶色 + 当前底层色）。

## 进度系统

- 存档：解锁关卡、最高关卡、总分、星级、每关最佳效率、隐藏挑战、音效开关。
- 主菜单成长条：按累计星数计算进度，展示通关数、三星数与总分。
- 结算面板：效率（沙/桶）、与历史最佳的差值、隐藏挑战徽章。
- 分数：每粒沙 `+10`、每桶 `+50`、合成 `+80`、通关 `+100`；星级按关卡阈值判定。

## 结构

```text
src/
  main.js / styles/main.css
  config/  colors.js · levels.js · settings.js
  game/    Game.js · GameLogic.js · GameRenderer.js · solver.js
           AnimationManager.js · ParticleSystem.js · AudioManager.js
           LevelManager.js · SaveManager.js
  ui/      Menu.js · GameHUD.js · PauseModal.js · ResultModal.js
  platform/PlatformAdapter.js
scripts/ generate-levels.mjs · validate-levels.mjs · game.test.mjs
.github/workflows/deploy-pages.yml
```

## 在线地址

https://yang-0930.github.io/rainbow-sand-puzzle/

推送 `main` 会由 GitHub Actions 自动测试、构建并部署 Pages。

## 验收记录

- `npm test`：14/14 通过（含冻结、封锁、预算、隐藏目标、存档扩展、36 关可解）
- `npm run validate`：36/36 关自动模拟通关
- `npm run build`：通过；浏览器实测新机制与反馈，控制台无错误。
