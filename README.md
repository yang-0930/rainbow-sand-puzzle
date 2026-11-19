# Rainbow Bucket · 沙画消消消

一款复刻“沙画彩桶 / 传送带接沙”玩法的 HTML5 休闲游戏：上方是像素沙画，点击彩色桶送上有限槽位的传送带，沙桶自动吸走沙画底层的同色沙，三个相邻同色小桶合成大桶，清空整幅沙画即可通关。基于 Vite + Canvas 2D，支持手机竖屏与 PC，含 30 个经过求解验证的关卡。

## 运行

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm test           # 规则与存档单元测试
npm run levels     # 确定性重新生成 30 关
npm run validate   # 自动模拟逐关通关
```

## 玩法规则

- 沙画由多层彩沙堆叠，**每列最底层的沙粒**是当前可收集目标。
- 点击底部彩色桶按钮（或按数字键 `1`~`4`），把一个小桶送到传送带第一个空槽。
- 传送带上的桶按节拍自动吸取同色底沙；吸满后自动消失并腾出槽位，上层沙粒向下滑落。
- 三个相邻的同色**小桶**会自动合成一个容量三倍的大桶，并保留已吸入的沙量。
- 传送带槽位有限（5~7 个）。槽位占满且没有任何桶能吸到当前底层沙色时，挑战失败。
- 沙画清空后，传送带剩余桶自动结算，进入通关界面。
- `Esc` 暂停/恢复；暂停时吸沙节拍与动画完全冻结。

### 策略性来源

- **槽位管理**：传送带不能塞满无效桶，必须预判底层颜色变化。
- **合成取舍**：三个同色小桶合成大桶能省槽位、提高效率，但会暂时占用三个位置。
- **颜色顺序**：底层沙色会随收集改变，优先处理大面积连片颜色更省槽位。
- **节奏**：吸沙是实时进行的，放置过快容易堵带，过慢则浪费时间；胜负判断始终基于实际沙量。

## 计分与星级

- 每吸走一粒沙 `+10`
- 每个沙桶吸满 `+50`
- 三桶合成大桶 `+80`
- 通关 `+100`，另外按剩余桶的未填满容量结算奖励
- 星级按每关 `scoreThresholds` 判定，1/2/3 星分别为完成、达到第二阈值、达到第三阈值。

## 项目结构

```text
src/
  main.js / styles/main.css
  config/  colors.js · levels.js · settings.js
  game/    Game.js · GameLogic.js · GameRenderer.js · AnimationManager.js
           ParticleSystem.js · AudioManager.js · LevelManager.js · SaveManager.js · solver.js
  ui/      Menu.js · GameHUD.js · PauseModal.js · ResultModal.js
  platform/PlatformAdapter.js
scripts/ generate-levels.mjs · validate-levels.mjs · game.test.mjs
```

`GameLogic` 只处理纯数据（沙列、槽位、计分、胜负）；`GameRenderer` 负责 Canvas 绘制；`Game` 驱动实时吸沙节拍、动画、音效与界面。`levels.js` 由生成器产出，与游戏逻辑完全分离。

## 关卡生成

`generate-levels.mjs` 用固定种子（mulberry32）生成 14 种参数化沙画图案（心形、星形、月亮、猫、火箭等），再按关卡难度分配颜色数（2~4）、槽位数（5~7）、小桶容量（3~4）与吸沙速度。候选关卡必须通过 `solver.js` 的放置序列搜索才能入库，兜底方案为规则化棋盘。`validate-levels.mjs` 再用真实 `GameLogic` 按求解路径完整模拟通关。

## 技术调研（简短）

参考了“沙画消消消 / 沙子清除”这类已上线休闲游戏的公开玩法说明：上方像素沙画、点击彩色沙桶送上传送带、自动吸取同色底沙、三个小桶合成大桶、槽位占满且无可吸沙色即失败。本项目仅复刻玩法机制，未使用其代码、素材、关卡数据或品牌；图案、渲染、动画、音效和 30 个关卡均为独立实现。

## CiDi Games 适配

核心逻辑不含平台 SDK。生命周期集中在 `src/platform/PlatformAdapter.js`，当前为纯浏览器实现，提供 `init / pause / resume / gameOver` 接口。未确认的平台能力均未擅自接入。

## 验收记录

- `npm install`、`npm run dev`、`npm run build`：通过
- `npm test`：9 项通过（放置、吸沙、重力、合成、死锁、通关防重复计分、星级、存档容错、30 关可解）
- `npm run validate`：30/30 关通过自动模拟
- 浏览器实测：放置沙桶、自动吸沙、三桶合成、通关与失败弹窗、暂停冻结、重新开始、下一关、刷新后存档、音效开关；360×640 / 414×896 / 1280×800 无横向滚动；控制台无错误。
