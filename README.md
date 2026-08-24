# 伊索尔德 / ISOLDE ——原型（0.23）

一个单文件的暗黑中世纪奇幻文字游戏原型

> 本仓库只包含原型本体与它的自动化测试脚本，不含任何构建工具或依赖。**游戏本身零依赖、零安装。**

---

## 一、文件清单

| 文件 | 作用 | 需要 Node 吗 |
|---|---|---|
| `isolde-prototype.html` | **游戏本体**（唯一运行入口，所有代码都在里面） | 否，双击即玩 |
| `smoke-test.js` | 冒烟测试：完整流程自动游玩一遍（50 步） | 是 |
| `fuzz-test.js` | 模糊测试：随机点按钮+随机指令找崩溃 | 是 |
| `verify-tw.js` | 验证打字机效果与存档码编解码往返 | 是 |
| `README.md` | 本说明 | — |

---

## 二、如何运行

### 直接玩（推荐）
- 下载/克隆后，**双击 `isolde-prototype.html`**，用任意现代浏览器（Chrome / Edge / Firefox）打开即可
- 手机浏览器也能打开，但电脑体验更好

### 本地服务器（可选）
想用 http:// 访问时，在仓库目录起任意静态服务器，例如：

```bash
python -m http.server 8000
# 或
npx http-server -p 8000
```

然后访问 `http://localhost:8000/isolde-prototype.html`。

### 更新版本后
- 若界面看起来像旧版：**Ctrl+F5 强制刷新**
- 标题界面第一屏会显示版本号（当前 `原型 0.23`）

---

## 三、玩法速览

- **界面**：终端风格。文字逐字打印（可在系统菜单关闭「打字机效果」），下方是行动按钮，底部是命令输入框
- **战斗**：回合制。攻击·正面（×0.8）/ 侧面（×1.3）/ 刺腹部（弱点）/ 连携（随从协同，+15%/人）/ 战技（每把武器一招，2 回合冷却）/ 格挡 / 闪避 / 道具 / 逃跑
- **进度**：营地「休息」= 存档 + 过一天；告示板接活计，累计活计解锁 BOSS / 高阶 / 高危 / 地城委托
- **寻踪**：BOSS 与委托任务**不直接告知地点**——接单后到城外游荡，偶遇「寻踪·×××」场景再进去；多个任务同时追踪时随机遇其一
- **装备**：商店购买的武器/护甲**进入背包**，在营地「换武器」「穿戴护甲」手动装备（不再自动装备、不再折价卖掉旧装备）
- **锻造**：铁匠铺定制武器/护甲，可选最多 **20 件辅料叠加**（词条、攻击加成、品质保底全部累加）；**护甲材质由第一个放入的辅料决定**（如第一个放龙鳞 → 龙鳞甲）；「熔炼精钢」可产出大马士革刀的原料；「管理者材料」武器+80 攻击 / 护甲+80 防御
- **龙**：老龙（拼尽全力的一战）→ 各区域龙（赤河龙/泥沼龙/旱地龙/墓岩龙/渡河龙，可击杀）
- **龙巢肉鸽**：完成风角港「探索龙巢穴」委托后解锁「龙巢深处·无限下潜」——无限层数
- **死亡**：噩梦后回营地，不删档

### 城镇（自南向北）
阿什沃德（血灾）→ 克罗姆福德（蛙灾）→ 坦沃（虱灾）→ 白石镇（正常地区）→ 利恩菲尔（蝇灾）→ 沃林（畜疫灾）→ 风角港（沿海·非灾区）

---

## 四、命令输入框

随时可输入（不带斜杠的是玩家指令，带斜杠的是开发者指令）：

| 指令 | 效果 |
|---|---|
| `看` | 重看当前场景描述 |
| `状态` / `背包` / `帮助` | 打开对应面板 |
| `敌情` | 战斗中查看敌人属性 |
| `/dev` | 列出全部开发者指令 |
| `/钱 数量` `/级 数量` `/item 名称 数量` | 刷资源 |
| `/heal` `/god` `/kill` `/天 数量` | 回满 / 无敌开关 / 秒杀 / 跳天数 |
| `/通缉` `/清人` `/reset` | 通缉开关 / 清随从 / 重置 |
| `/克` `/坦` `/利` `/沃` `/白` `/风` | 直接跳转到各城镇 |
| `/龙` `/赤龙` | 触发老龙 / 40 级赤河龙 |

---

## 五、存档

- 存档存在**浏览器本地**（localStorage），键名 `isolde_proto_v1`，设置键 `isolde_settings`
- 营地休息自动存档；系统菜单可手动存档/读档
- **存档码**：系统菜单「导出存档」会打印一段 `ISOLDE...` 文字码，复制后可在任何浏览器「导入存档」续玩——换设备、发给朋友都靠它
- **旧档兼容**：每次版本更新都会自动迁移旧存档补全新字段，旧档永不失效
- 清除浏览器站点数据 = 删档；导出存档码可备份

---

## 六、自动化测试（开发者）

需安装 [Node.js](https://nodejs.org)（仅运行测试需要，玩游戏不需要）：

```bash
node smoke-test.js      # 冒烟测试：新游戏一路打到终局（50 步断言）
node fuzz-test.js [seed] [步数]   # 模糊测试：随机乱点找崩溃，如 node fuzz-test.js 7 600
node verify-tw.js       # 验证打字机逐字打印 + 存档码编解码往返
```

- 冒烟测试输出 `=== 冒烟测试 v3 全部通过 ===` 即正常
- 模糊测试结尾 `崩溃=0` 即正常

---

## 七、版本历史（摘要）

- **0.23**：寻踪系统（BOSS 委托不再告知地点，野外游荡偶遇 BOSS 房）、购买武器/装备改为入背包（营地手动装备）、锻造材质由首个辅料决定、通用「管理者材料」（攻+80/防+80）、区域龙（赤河/泥沼/旱地/墓岩/渡河龙）、商店跳转修复
- **0.22**：七座城镇（含正常地区白石镇、沿海风角港）、大马士革刀 7200 铜币/+50、精炼熔断钢铁、龙巢无限下潜肉鸽与第 50 层裂纹的臂甲、巨鲸之泉龙
- 更早：四/五城扩张、连环与高危委托、多材料锻造、打字机效果、存档码导入导出、东方武器异纹等
- 如有问题和疑惑欢迎给我的邮箱；en114514896@outlook.com
- 或者直接发送到我的qq； 195048316





# ISOLDE ——Prototype (0.23)

A single-file dark medieval fantasy text game prototype.

> This repository contains only the prototype itself and its automated test scripts. It does not include any build tools or dependencies. **The game itself has zero dependencies and requires no installation.**

---

## 1. File List

| File                    | Purpose                                                                        | Requires Node.js?             |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| `isolde-prototype.html` | **The game itself** (the only entry point; all code is contained in this file) | No, just double-click to play |
| `smoke-test.js`         | Smoke test: automatically plays through the entire game flow (50 steps)        | Yes                           |
| `fuzz-test.js`          | Fuzz test: randomly clicks buttons and enters random commands to find crashes  | Yes                           |
| `verify-tw.js`          | Verifies the typewriter effect and save-code encode/decode round-trip          | Yes                           |
| `README.md`             | This documentation                                                             | —                             |

---

## 2. How to Run

### Play Directly (Recommended)

* After downloading or cloning the repository, **double-click `isolde-prototype.html`** and open it with any modern browser (Chrome / Edge / Firefox).
* It can also be opened in a mobile browser, but the experience is better on a computer.

### Local Server (Optional)

If you want to access the game over `http://`, start any static server in the repository directory. For example:

```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

Then visit `http://localhost:8000/isolde-prototype.html`.

### After Updating to a New Version

* If the interface looks like an old version: **press Ctrl+F5 to force-refresh**
* The title screen displays the current version number (currently `Prototype 0.23`)

---

## 3. Gameplay Overview

* **Interface**: Terminal-style UI. Text is displayed character by character (the "Typewriter Effect" can be disabled in the system menu). Action buttons are displayed below, with a command input box at the bottom.
* **Combat**: Turn-based. Attack · Front (×0.8) / Side (×1.3) / Stab the Abdomen (weak point) / Team-up (companion coordination, +15% per companion) / Weapon Skill (one skill per weapon, 2-turn cooldown) / Block / Dodge / Items / Flee
* **Progression**: Resting at camp = save + advance one day. Take jobs from the bulletin board. Accumulating completed jobs unlocks BOSS / advanced / high-risk / dungeon contracts.
* **Tracking**: BOSS encounters and contracts **do not directly reveal their locations**. After accepting a job, wander around the wilderness until you encounter a "Tracking · ×××" scene, then enter it. When tracking multiple quests simultaneously, one of them is selected at random.
* **Equipment**: Weapons and armor purchased from shops **are added to your inventory**. Equip them manually at camp using "Change Weapon" or "Equip Armor". Equipment is no longer automatically equipped, and old equipment is no longer automatically sold at a reduced price.
* **Smithing**: Customize weapons and armor at the blacksmith. You can stack up to **20 supplementary materials** (affixes, attack bonuses, and quality guarantees all stack). **The first supplementary material determines the armor's material** (for example, putting Dragon Scale in first produces Dragon Scale Armor). "Smelt Refined Steel" produces materials for Damascus blades. **Administrator Materials** provide +80 Attack for weapons and +80 Defense for armor.
* **Dragons**: The Ancient Dragon (a battle requiring everything you've got) → regional dragons (Red River Dragon / Swamp Dragon / Dryland Dragon / Grave Rock Dragon / River-Crossing Dragon), all of which can be killed.
* **Dragon's Nest Roguelike**: Complete the "Explore the Dragon's Nest" contract in Cape Horn Harbor to unlock "Depths of the Dragon's Nest · Infinite Descent" — with unlimited floors.
* **Death**: After a nightmare, you return to camp. Your save is not deleted.

### Towns (South to North)

Ashwood (Blood Plague) → Cromford (Frog Plague) → Tanwo (Lice Plague) → Whitestone (Normal Region) → Lienfield (Fly Plague) → Wolin (Livestock Plague) → Cape Horn Harbor (Coastal · Non-Plague Region)

---

## 4. Command Input

Commands can be entered at any time. Commands **without a slash** are player commands, while commands **with a slash** are developer commands:

| Command                        | Effect                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `看`                            | Re-display the current scene description                       |
| `状态` / `背包` / `帮助`             | Open the corresponding panel                                   |
| `敌情`                           | View enemy stats during combat                                 |
| `/dev`                         | List all developer commands                                    |
| `/钱 数量` `/级 数量` `/item 名称 数量`  | Add resources                                                  |
| `/heal` `/god` `/kill` `/天 数量` | Fully heal / toggle invincibility / instantly kill / skip days |
| `/通缉` `/清人` `/reset`           | Toggle wanted status / remove all companions / reset           |
| `/克` `/坦` `/利` `/沃` `/白` `/风`  | Instantly travel to the corresponding town                     |
| `/龙` `/赤龙`                     | Trigger the Ancient Dragon / Level 40 Red River Dragon         |

---

## 5. Save System

* Saves are stored **locally in the browser** using `localStorage`, with the keys `isolde_proto_v1` and `isolde_settings`.
* Resting at camp automatically saves the game. The system menu also allows manual saving and loading.
* **Save Codes**: Selecting "Export Save" from the system menu generates a text code beginning with `ISOLDE...`. Copy it and use "Import Save" in any browser to continue playing — allowing you to transfer saves between devices or share them with friends.
* **Legacy Save Compatibility**: Every version update automatically migrates old saves and fills in newly added fields. Old saves will never become invalid.
* Clearing the browser's site data will delete the save. Exported save codes can be used as backups.

---

## 6. Automated Tests (Developers)

[Node.js](https://nodejs.org) is required **only for running the tests, not for playing the game**:

```bash
node smoke-test.js      # Smoke test: plays from a new game to the ending (50-step assertions)
node fuzz-test.js [seed] [steps]   # Fuzz test: randomly interacts with the game to find crashes, e.g. node fuzz-test.js 7 600
node verify-tw.js       # Verifies the typewriter effect + save-code encode/decode round-trip
```

* The smoke test passes if it outputs:

```text
=== Smoke Test v3: ALL PASSED ===
```

* The fuzz test passes if the final output shows:

```text
Crashes=0
```

---

## 7. Version History (Summary)

* **0.23**: Added the tracking system (BOSS contracts no longer reveal their locations; wander the wilderness to encounter BOSS rooms), purchased weapons/equipment are now added to the inventory and must be manually equipped at camp, armor material is determined by the first supplementary material used in smithing, universal "Administrator Materials" (+80 Attack / +80 Defense), regional dragons (Red River / Swamp / Dryland / Grave Rock / River-Crossing Dragons), and a fix for shop navigation.

* **0.22**: Seven towns (including the normal Whitestone region and coastal Cape Horn Harbor), Damascus Blade — 7,200 copper / +50 Attack, refined steel smelting, infinite-descent Dragon's Nest roguelike mode, Floor 50 Cracked Bracer, and Giant Whale Spring Dragon.

* Earlier versions: Expansion from four/five towns, chain and high-risk contracts, multi-material smithing, typewriter effect, save-code import/export, Eastern-style weapons with unique patterns, and more.

* If you have any questions or encounter any issues, feel free to contact me by email: `en114514896@outlook.com`

* Or send me a message on QQ: `195048316`
