# 伊索尔德 / ISOLDE（0.25）

一个单文件的暗黑中世纪奇幻文字游戏

> 本仓库只包含游戏本体与它的自动化测试脚本，不含任何构建工具或依赖。**游戏本身零依赖、零安装。**

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
- 标题界面第一屏会显示版本号（当前 `0.25`）

---

## 三、玩法速览

- **界面**：终端风格。文字逐字打印（打字机效果三档：**正常/快速/关闭**，**点击文字可立即跳过**，系统菜单切换），下方是行动按钮，底部是命令输入框
- **图鉴与战历**：每场战斗都会记下讨伐的敌人（`图鉴` 命令或系统菜单「图鉴」按钮）——累计击杀、每种敌人的讨伐数与初见天数，高危之敌带「高危」标记；图鉴同时显示已缴密令份数
- **战斗**：回合制。攻击·正面（×0.8）/ 侧面（×1.3）/ 刺腹部（弱点）/ 连携（随从协同，+15%/人）/ 战技（**每把武器两招**——含连击/破甲/硬直/流血，2 回合冷却）/ **架势（攻/守/迅三态，战斗内随时切换**：攻势攻击+8%受伤+5%，守势受伤-10%攻击-8%，迅势闪避+10%攻击-5%）/ 格挡 / 闪避 / 道具 / 逃跑；**切换操控**：战斗中可把操控权切给任何队友（含佣兵）——由该角色主攻/格挡/闪避/用道具（不耗体力），**受控角色也能用自己武器的战技（独立冷却）与法术（扣自己的法力，回血自动落在受伤最重的队友身上）**，连携/横扫仍仅主角可用，被操控角色倒下自动交还主角；**敌阵系统**：成建制的敌人会同场成阵——可**切换目标**逐个击破、用**横扫**（全体×0.6）打整排，敌人之间会**号令**（队长在场全队+3攻）、**同型连携**（同类越多越狠）、**盾阵**（盾兵掩护全队+3防），先杀队长/盾兵能拆掉协作
- **战斗信息**：每回合开始前显示「敌意」——敌人会预告下一击与目标（可能盯上你的队友）；盾系敌人会格挡（你的下一击减半）；队友有生命值，可指挥「防御」（减半所受伤害、暂停出手）或「攻击」；体力消耗规则在战斗界面与「帮助」中标注（攻击10 · 连携12 · 战技按武器 · 格挡5 · 闪避10，体力<10 伤害-40%）
- **队伍**：每场战斗你行动后，每个队友依次进入决策阶段（战斗/防御/闪避/道具/**战技**/**法术**/逃跑，队友有各自法力，每回合回复2点）；「队伍」面板（每座城镇、系统菜单、营地都有按钮，或输入「队伍」）显示**队友**（骑士/安普卢斯/轩辕十四）的等级/经验/基础攻防/武器/生命与被动，佣兵不显示等级，并可以**切换队长**：主角（身先士卒·全队伤害+1）、落魄骑士（军心·全队伤害+1，他自身再+1）、安普卢斯（同行之誓·队友所受伤害-1）、轩辕十四（狮心王座·全队伤害+2）——佣兵不能当队长；队长离队时自动交还主角；**战斗外也能切换操控**（队伍面板「切换操控」，选择会带入下场战斗，状态栏有「操控」标记）
- **伙伴成长**：战斗胜利后，除佣兵外的伙伴（安普卢斯/骑士/轩辕十四）与主角分享同样的经验，升级提升基础攻击与生命上限；**铁匠铺「定制随从装备」锻造的是队友的基础攻防**（武器：基础攻击+2，可锻10次 / 护甲：基础防御+1，可锻10次，每4点防御自动加1层挡刀）
- **队友换武器**：营地「给队友换武器」——骑士/安普卢斯/轩辕十四可从你的武器库里挑选武器（武器攻击的 40% 转化为每击伤害），也可卸下；佣兵自备家伙不在此列
- **换装**：穿戴新护甲/饰物时，旧的自动放回包袱（不再折价消失）；**锻造护甲进「护甲包」**（对象存防御/部位，营地「穿戴护甲」可换装，背包命令可见），不会出现"显示装入背包却消失"
- **轩辕十四**：30级后，随机一座城镇的告示板会贴出「狮子之瞳」
- **成长**：等级上限 1000 级。1-119 级平缓成长；**120-200 级是黄金期**（每级加成最猛）；**200 级之后所需经验按指数增长（每级+1%），加成递减**；升级所需经验 = 等级×80（200级前）。15/30/50/70 级有攻击里程碑；武器显示「伤害+X」
- **进度**：营地「休息」= 存档 + 过一天；每座主城都有「歇脚」（恢复+存档+过一天）；告示板接活计，累计活计解锁 BOSS / 高阶 / 高危 / 地城委托
- **寻踪**：BOSS 与委托任务**不直接告知地点**——接单后到城外游荡，偶遇「寻踪·×××」场景再进去；多个任务同时追踪时随机遇其一
- **装备**：商店购买的武器/护甲**进入背包**，在营地「换武器」「穿戴护甲」手动装备（不再自动装备、不再折价卖掉旧装备）；**回收**：营地「回收装备（拆解）」把多余的武器/护甲/饰品拆成材料——武器按攻击给铁料（30攻以上另给精钢、带词条给旧银币）、护甲按防御给铁料、饰品按品质给铁料/旧银币（已穿戴的不拆，木剑不拆）
- **锻造**：铁匠铺定制武器/护甲，可选最多 **20 件辅料叠加**（词条、攻击加成、品质保底全部累加）；**护甲材质由第一个放入的辅料决定**（如第一个放龙鳞 → 龙鳞甲）；「熔炼精钢」可产出大马士革刀的原料；「管理者材料」武器+80 攻击 / 护甲+80 防御
- **饰品**：名册 **65 种**，最多同时佩戴 **6 件**，同类可重复获得；品质六级——**普通/优良/精品/史诗/大师锻造/狩猎品**；杂货铺卖普通款（铁指环/铜坠/麻布护符/木符/铜手环/石坠/草绳结/木珠链），异域商人卖优良到史诗款（银指环/猎鹿坠/蓝晶护符/断马刺/血石坠/狮牙坠/黑曜护符/星辉之坠/龙鳞护符/磐石坠/**连击指环（×2）**/**三棱刺坠（×3）**/**疾影符（×4）**/**迅填环（装填+20%，为将来的火枪准备）**/藏宝坠（报酬+10%）/学徒符（经验+10%）/猎鹰羽坠与影步符（闪避）/迅鹰之羽（逃跑+10%）/狼牙坠/皮护符/铜镜坠/血誓指环/铁心坠/龙牙护符/星屑坠/巨力护腕坠/圣银十字），BOSS 掉**狩猎品**（血池之瞳/巨蟾毒珠/骨瘟指骨/海妖泪晶/狮瞳之石/金冠徽记/血盐之心/龙骸坠/**千足节坠（×5）**/**十连星纹（×10）**/蛙母之卵/虱王须坠/墓守残徽/溺魂泪石/棺钉十字/摆渡人铜钱/潮音贝坠/狮鬃结/灰衣令符/赤河骑士纹/铸甲碎屑/灰烬余火/空甲浮环/泪雾坠等——**多段攻击饰品让一次挥剑连击2/3/4/5甚至10次**），铁匠铺「**大师锻造饰品：北归之誓**」第一章**仅此一件**（攻击+6·攻击+5%·生命+40·每回合回2生命，覆金属龙皮+精钢+龙鳞锻造）；营地「饰品」佩戴/卸下，效果接进攻击/减伤/吸血/亡者克制/回血/属性上限/连击数/闪避/逃跑
- **烹饪**：营地「烹饪」——8 道料理（佣兵糊/猎人炖锅/河边杂炖/篝火鱼/烤兽腿/铁骨汤/猛火兽肉/菌丝鱼汤），战斗「道具」或营地都能吃；铁骨汤（3场内所受伤害-2）、猛火兽肉（3场内攻击+3）、菌丝鱼汤（3场内闪避+5%）带**场次增益**——攻/防/速三类 buff 随战斗场次递减，同类取最高
- **炼金**：营地「炼金」——8 种产物（生命药水/猛力药/硬皮药/迅捷药/净化药/龙息火瓶/血盐涂毒/罂粟安眠药），素材来自怪物掉落（骨、血盐、血水结晶、蛇皮、蛛丝、龙鳞、蛙油膏、罂粟、苦蜜蜡等）；**血盐涂毒**给武器淬毒（5次命中附加流血），龙息火瓶战斗投掷（惧火者×2），**罂粟安眠药**镇住活着的魔枪（布里欧纳克每战消耗1份）
- **传奇武器（第一章）**：**提尔锋**——阿什沃德「庄园废墟」的焦黑空心树里，无门槛圣物：拔出后融入体内（伤害+25%、攻击+8），但背负**必杀之约**（每场战斗必须伤敌，否则战斗结束提尔锋借你的手刺穿自己）；**佛拉格拉克**——坦沃传说讨伐「灰土高地龙」：应答之剑，每战开局自动先攻，伤口永不愈合（不愈流血）；**布里欧纳克**——沃林传说讨伐「魔化之人」：活着的魔枪，每战开局自动齐射——有罂粟安眠药则五道光全打敌人，没有则四道打敌人一道反噬你
- **背景设定**：主角是北方人，领地被夺、人被放逐到南境——解放南境七城、缴获北方军阀的密令，最后北归与夺走他领地的人决战（第二章）。**击败高危之敌缴获「军阀密令」**（黑棘城高危委托、各城极危悬赏、解放战争的祸首、传奇骑士与巅峰BOSS），普通敌人不掉；密令逐份揭开北方军阀的阴谋（累计查看）
- **领地解放**：每一座大城（阿什沃德/克罗姆福德/坦沃/利恩菲尔/沃林/兰德尔/卡尔沃）都有**解放主线任务**（讨取城中祸首），周边城镇各有**解放任务**（渡口/白石/风角港/石桥/灰岩/白水/东岭/北望/南碑/潮音/北岭/霜谷/银盾/灰墙要塞）；**城市的祸首与解放战争都在城内打**——军阀的走狗不会躲在郊外，接单后直接在告示板点「讨取祸首」（城内决战），完成本城主线+隶属周边后告示板解锁「**⚔ 解放战争**」（带亲兵的祸首决战·敌阵），胜利后城市**解放**（场景变化+专属武器+材料）；周边城镇的解放任务仍在野外寻踪。黑棘城是边境要塞，不在此列
- **法术系统**：消耗**法力（MP）**施放法术——初始学会「飞石」（单体）与「治愈微光」（回血）；**法术书在各处有售**：杂货铺16种（火舌/霜刃/石拳/冰锥术/荆棘缠绕/治愈环流/雷击/霜雾/疾风刃/净光术/深眠咒/碎石雨/恐惧术/虚弱诅咒/迟缓诅咒/幻影术）、异域商人10种（灼热射线/生命虹吸/灼热新星/御土之盾/增幅术/破甲诅咒/疫病诅咒/背运诅咒/安抚幻觉/失志诅咒），北境萨满掉「法术书·北风之怒」——营地里「研习法术」学习（共29种：元素/治疗/吸血/净化/护体/增幅/**控场三学派**——诅咒系上减益、精神系恐惧、幻觉系幻影，敌人带攻击-、防御-、疫病、霉运掉落率+30%等减益字段）；**法术记忆槽**：主角不是法师——按等级只能带 3/5/8/12/15 个法术进战斗（1-10/11-20/21-30/31-40/41+），营地里「研习法术」界面记忆/遗忘，新学的法术自动记忆；法杖武器给法术增伤，裂纹臂甲法伤+25%同样生效；**法术效率整体为期望值的四分之一**（另有安排——将来会有一位法术效率很高的伙伴）；**队友也会法术**：每回合决策或操控队友时，队友可用自己武器的战技与主角已记忆的法术（各自法力，每回合+2）；**轩辕十四有独立法术池**——六个狮子/星辰主题的**强化身体型法术**（狮心鼓动：回30%生命 / 星辉甲胄：本场所受伤害-4 / 狮王之力：本场攻击+6 / 猎星之眼：命中15%震住目标 / 星坠步：每回合回5生命 / 狮吼：震住目标且其攻击-3），每场战斗重新开始；状态栏显示法力
- **批量买卖**：杂货铺/铁匠铺购买与出售消耗品和材料时，点击后可选 **1 / 5 / 10 / 全买（全卖）** 数量，一次成交
- **龙**：老龙（拼尽全力的一战）→ 各区域龙（赤河龙/泥沼龙/旱地龙/墓岩龙/渡河龙，可击杀）
- **传奇骑士**：15级起，七城郊野游荡各可能撞见一位（击败不再刷新，可逃跑）：报丧骑士·菲洛斯（阿什沃德·泪蚀）→ 腐败骑士·多明戈（克罗姆福德·毒蚀）→ 断弓骑士·马特奥（坦沃·断弓魔箭）→ 苍白骑士·塞拉斯（利恩菲尔·不死·复活2次）→ 寒铁骑士·维罗妮卡（沃林·冰冻）→ 断剑骑士·塞萨尔（白石镇·断剑铁拳两路）→ 鲸骨骑士·华金（风角港·鲸油·惧火）。每位掉专属武器+锻造材料（部分掉饰物/甲胄素材）
- **精英掉落**：精英与 BOSS 敌人战后额外掉落专属装备——武器进包袱（营地换武器可装备）、护甲/素材进包袱（可穿戴/可锻造）
- **龙巢肉鸽**：完成风角港「探索龙巢穴」委托后解锁「龙巢深处·无限下潜」——无限层数
- **死亡**：噩梦后回营地，不删档

### 城镇与道路（第一章·南境）
阿什沃德（血灾）→ 克罗姆福德（蛙灾）→ 坦沃（虱灾）→ 白石镇（正常地区）→ 利恩菲尔（蝇灾）→ 沃林（畜疫灾）→ 风角港（沿海·非灾区）→ 渡口镇（中转）→ 古战场（阴气之地）→ **兰德尔（疮灾·枢纽）** → 卡尔沃（雹灾·北门）——北上是斯特恩（蝗灾），第二章未开放

- **三座枢纽镇**：石桥镇/灰岩镇/白水镇（去兰德尔路上，各向多城镇辐射，有直达旧灾区的路：石桥镇⇄沃林、灰岩镇⇄利恩菲尔、白水镇⇄白石镇）
- **东线出海**：兰德尔北上被高山挡住——东行 东岭镇→松风镇→峭壁镇→青石镇→北泉镇→潮音港（左右还有白雾/鹿鸣/响水/观海四镇），完成主线「疏通港道」后可坐船横渡北岭港（5段航程，海上可能遭海狼/海盗/海妖袭击），再走 霜谷镇→银盾镇，穿过灰墙要塞（守军盘查要打一场，也可绕西侧山口）抵达卡尔沃
- **海路互通**：疏通港道后 潮音港⇄北岭港⇄风角港 三港坐船互通（均为5段航程）
- **北境高危区**：北望镇北上六段到黑棘城（告示板有24个高危委托：8个可重复+16个一次性，最终目标是黑棘城主本人），黑棘城西行六段到风角港；南下两段进黑原荒野，荒野再南是北古战场（可遇高危强力boss北境战帅，另有**军团事件**：北境战帅率12~48人的部队列阵，**8~10波混编骑士阵**——北境战兵/弃誓/黑甲/灰甲/腐甲/疫岸/赤河/潮岸/铁壳/雹铁骑士+无头战魂/战旗亡魂/要塞逃将轮流出阵，**每阵掉骑士装备**，打完战帅后军团还会再集结可反复刷，40人的概率最大）
- **古战场周边**：北望镇（北·通兰德尔/东荒原/黑棘城）、南碑镇（南·通渡口镇/石桥镇）、东荒原（东·荒野区，可东去东岭镇）；南边古战场游荡会刷新**北境战兵**与更老更强的**古战场龙**（掉龙鳞/龙皮/精钢），并有断旗抉择、无名坟、老兵鬼影等事件与支线**「野兽的呼唤·其一」**（古战场触发，其二其三之后再做）
- **告示板**：所有新城镇的告示板都有 4 个交付委托 + 4 个通用悬赏（山道劫匪/走私盐贩/野狼群/溃兵，当场开打、可重复）
- **道路**：城镇之间按段行进（3段/程，途中可扎营/探索/体验地区事件）；不再是单行道，枢纽镇向外辐射
- **地图**：输入 `地图` 或点系统菜单/新城镇的「地图」按钮查看世界地图（当前所在城镇金色高亮）

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
| `/管理员 数量`（`/管理` 同） | 加管理者材料（锻造辅料：武器+80攻 / 护甲+80防） |
| `/heal` `/god` `/kill` `/天 数量` | 回满 / 无敌开关 / 秒杀 / 跳天数 |
| `/活 数量` | 直接设已完成活计数（解锁告示板大委托） |
| `/通缉` `/清人` `/reset` | 通缉开关 / 清随从 / 重置 |
| `/克` `/坦` `/利` `/沃` `/白` `/风` | 直接跳转到各城镇 |
| `/龙` `/赤龙` | 触发老龙 / 40 级赤河龙 |
| `/狮子` `/双狮` | 一键前置（30级+五遗物+狮心剑）/ 直接开始双狮之试 |
| `/骑士 N` | 直接挑战传奇骑士（1报丧/2腐败/3断弓/4苍白/5寒铁/6断剑/7鲸骨） |
| `/军团` | 触发北古战场特殊事件：北境战帅率队（8~10波混编骑士阵，可刷骑士装备） |
| `/安普` `/妖僧` | 直接召唤安普提斯 / 妖僧·拉斯普提（游荡Boss战） |

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

- **0.25**：**军阀密令改由高危之敌掉落**——黑棘城高危委托、各城极危悬赏、解放战争的祸首、传奇骑士与巅峰BOSS身上才有，普通敌人不再掉落（首战有提示）；**敌人图鉴与战历**（`图鉴` 命令+系统菜单按钮：累计击杀、每种敌人的讨伐数与初见天数、高危标记、已缴密令）；**队友战技与法术**：受控队友与决策阶段的队友都能施放自己武器的战技（独立冷却）和主角已学会的法术（各自法力，每回合回复2点，治疗自动落在受伤最重者身上）；**轩辕十四法术池**：六个狮子/星辰主题的强化身体型法术（狮心鼓动/星辉甲胄/狮王之力/猎星之眼/星坠步/狮吼），每场战斗重新开始；**战斗外切换操控**（队伍面板，带入下场战斗，状态栏显示「操控」）；**解放战争城内化**：城市祸首讨取与解放战争都在城内告示板直接开打（军阀的走狗就在城里），周边城镇解放任务仍在野外寻踪；**法术商店扩容**：法术书从2种可购扩到11种（杂货铺8种：火舌/霜刃/石拳/冰锥术/荆棘缠绕/治愈环流/雷击/霜雾；异域商人3种：灼热射线/生命虹吸/灼热新星），新增吸血（生命虹吸）与全队治疗（治愈环流），共14种法术；**饰品系统**：最多同时佩戴6件、同类可重复获得，六档品质（普通/优良/精品/史诗/大师锻造/狩猎品）——商店售卖+BOSS掉狩猎品+铁匠铺大师锻造「北归之誓」（第一章仅此一件），效果接进攻击/减伤/吸血/亡者克制/回血/属性上限；**营地烹饪与炼金**：烹饪8道料理（铁骨汤/猛火兽肉/菌丝鱼汤带攻防速场次buff，随战斗递减）、炼金7种产物（生命药水/猛力药/硬皮药/迅捷药/净化药/龙息火瓶/血盐涂毒——涂毒5次命中附加流血）；**法术再扩容至20种**（疾风刃/碎石雨/净光术/深眠咒/御土之盾/增幅术）；**正式转正**：标题与文档去掉「原型」字样；状态面板修复过时文本（法术列表与1000级上限）；**控场三学派法术**（恐惧术/虚弱诅咒/迟缓诅咒/破甲诅咒/疫病诅咒/背运诅咒/幻影术/安抚幻觉/失志诅咒——敌人侧攻击-/防御-/疫病/霉运掉落+30%减益，法术总数29）；**法术记忆槽**（按等级带3/5/8/12/15个法术，营地记忆/遗忘）；**传奇武器·提尔锋**（阿什沃德庄园废墟，融入体内增伤+必杀之约诅咒）、**佛拉格拉克**（坦沃灰土高地龙Boss，自动先攻+伤口不愈）、**布里欧纳克**（沃林魔化之人Boss，五光齐射+罂粟安眠药镇压联动炼金）；**更多饰品**（连击指环×2/三棱刺坠×3/疾影符×4/千足节坠×5/十连星纹×10的**多段攻击**、迅填环**加速换弹**为将来火枪准备、藏宝坠/学徒符加报酬经验、磐石坠减伤）；**管理者材料退出武器与饰品配方**（护甲锻造仍可用，正常游戏也能拿到大师锻造饰品）；**武器战技系统重写**：每种武器3个战技（基础+第二+第三战技），按**武器熟练度**解锁（使用30/80/150/300次→Lv1/2/3/5，Lv4+10%伤害/Lv5+20%伤害且耐力-10%，同类型武器共享），重武器带**架势系统**（大剑/重剑：攻势·守势·破势；焰型大剑：霸体势·狂战势·魔导势，各带追加专属战技）；**锻造重写为部位选材**：先选大类再逐部位选材（剑身/剑柄/护手/杖身/杖头……），材质决定加成——陨铁精准、龙钢锋利、古战场铁噬魂、鲸骨省耐力、疫骨出血腥、血术硬化钢血腥（第二章才可用），杖身带学派偏向（白蜡木元素/紫杉木诅咒/赐福木/诅咒载体木/橡木防御），任何等级2.1%概率出东方武器；**龙钢配方**：精炼熔断钢铁×1+覆金属龙皮×10+龙鳞×10→龙钢×1（铁匠铺熔炼，锻造剑身攻击+20%+锋利）；**新材料获取**：陨铁（异域商人轮换小概率）、古战场铁（杂货铺轮换）、血术硬化钢（第二章锁）、木/竹/骨/鲸骨/橡木/白蜡木/紫杉木/赐福木/诅咒载体木（杂货铺与巫师店出售）；**黑棘城巫师店**：定制优质法杖（部位选材）+现成的诅咒/赐福优质法杖+更多法术书（秘法飞弹/心智鞭笞/星陨术+12本大伤害法术：陨星天降/焚世烈焰/绝对零度/雷霆万钧/湮灭射线/北境冰暴/死亡一指/血沸术/灵魂湮灭/精神崩解/灵魂尖啸/神罚之矛，法术总数44）；**锻造十连下料**：部位选材与护甲辅料均可一个环节一次性下10份（×10按钮，加成按10份叠加）；**收复灰墙要塞**（卡尔沃告示板主线·需卡尔沃已解放）：决战灰墙守备长后要塞易帜成为自家地盘——佣兵容量2→6，开放练兵场训练佣兵（每回合伤害+1/生命+10，最多+6）；**装备回收**（营地拆解多余武器/护甲/饰品换材料）；**文本加速**（打字机三档正常/快速/关闭+点击文字立即跳过）；**精钢必史诗**：精炼熔断钢铁锻造的剑身攻击+20%且保底史诗；**熔炼旧武器**：铁匠铺可把旧武器回炉成锋利精钢（继承原武器四分之一攻击），锋利精钢可作锻造材料，继承攻击直接加进新武器；**安普提斯**（角色档案·九）：在黑棘城完成10件委托后，她作为游荡Boss刷新在黑棘城荒野——击败三次后可劝降入队（第一次「有意思」、第二次「又来了？你比那个疯子执着」、第三次「……算了」→跟我走/走开），败后480秒复活；入队后法术效率为寻常法师3~5倍，妖术/诅咒/幻觉（精神与诅咒系）六倍；**轩辕十四队友强化**：荣耀之锁正面受击-35%、剑意蓄势（每回合+5%攻击最多5层，受击-1层）、半血不屈（3回合锁血1+攻击+30%）、四分之一血兽形解禁（二阶段狮子型：攻击+50%、回血30%、撕裂爪击流血、狂怒连击三连、狮吼真实伤害、末路狂奔、猎食本能）、DYO「以荣冠加冕无名之身」（每4回合为玩家加冕3回合攻击+30%）；**与轩辕十四单挑**（白水镇告示板·需先完成招募）：白水河畔solo决战——荣耀之锁近战-35%、剑意、不屈、兽形解禁二阶段、终焉一击（5%血以下必发×3，撑过即胜），交差+150铜币且轩辕十四永久攻击+15/防御+5；**妖僧·拉斯普提**（游荡妖魔·不可招募）：累计击败10名骑士后解锁（黑棘城酒馆打听），全地图随机游荡主动攻击，60-120级浮动、480秒复活且每败+0~5级，假死×3+越打越疯（每次复活全属性+15%）、暗愈/催眠注视/妖僧术/左手独立施法/嘲讽，安普提斯在场遭遇概率+50%且对他伤害×1.5，火系法术+30%；掉落妖僧残页/碎甲片/疯狂核心/毒血，首败掉疯子的蜡烛（通往格里莫的路）；**修复**：队友重武器战技曾取到「架势切换」（无伤害倍率）把敌人血量打成NaN（现队友战技取带伤害的那招），架势加成不再漏给非重武器，非法架势旧档自动归位，敌人/队友血条NaN自修复
- **0.24**：第一章·九灾南境——新增渡口镇（中转）、古战场（阴气游荡区）、兰德尔（疮灾·枢纽，道路辐射多城镇）与卡尔沃（雹灾·北门，第一章终点，北上是第二章的斯特恩）；新增18种敌人（灰壳暴徒/矿场监工/铁匠骑士/灰壳遗族/疮兽/雹铁猎人/驻军巡逻兵/避雷匠/焦土遗族/雹狼/战场游魂/矿脉龙/雷崖龙/矿脉巨像/雷崖雷鸟/铸甲骑士·埃内斯托/灰烬骑士·鲁文/空甲骑士·奥古斯丁）与新的悬赏、支线BOSS、锻造材料（雹铁/雷核/矿脉核心/灰烬核心/空甲核心/灰壳残片/疮药膏等）；**地图系统**（`地图` 命令+按钮，当前所在城镇金色高亮）；轩辕十四登场改为仅一次（第二场起自动随队出战）；轩辕十四支线不再点名、不说"遗物"，占星师与狮心剑引导强化；裂纹的臂甲强化（法伤+25%/队友+4/生命+100）；七位传奇骑士；五个地区BOSS与五个支线BOSS、五个地区骑士悬赏；精英掉落重做（一次性BOSS必掉武器，可刷敌人低爆率）；**精英强化**：Lv20+的一次性精英与首领生命+25%/攻击+15%/经验+30%（传奇骑士与巅峰级BOSS不变）；**成长曲线优化**：等级上限提至1000，每10级生命/体力成长提速，15/30/50/70级攻击里程碑，**120-200级黄金期加成最猛，200级后经验指数增长、加成递减**；**管理者材料**：新增 `/管理员` 指令，旧名「管理员材料/管理员物品」自动并入可正常锻造（武器+80攻/护甲+80防）；黑棘城告示板/扎营返回错误修复；**护甲包**：锻造护甲不再"入背包即消失"——存入护甲包（营地穿戴护甲/背包命令均可见），换下的旧甲同样入包；**队友系统**：营地「给队友换武器」（武器40%转化每击伤害，佣兵除外）、铁匠铺随从锻造改为加基础攻防（武器+2攻可锻10次/护甲+1防可锻10次，每4防=1挡刀层）、轩辕十四基础攻防比同等级主角高20并随等级重算、队伍面板显示队友等级/攻防/武器（佣兵不显示等级）；队伍切换队长、伙伴经验、换装回包；三座枢纽镇（石桥/灰岩/白水）与东线港口链（东岭→松风→峭壁→青石→北泉→潮音港，疏通港道后坐船到北岭港→霜谷→银盾→灰墙要塞→卡尔沃）；三港海路互通（潮音港⇄北岭港⇄风角港）；北境高危区：黑棘城（24个高危委托：8可重复+16一次性，高危敌人全线强化并配专属招式，最终目标黑棘城主），黑棘城西行六段到风角港；北古战场新增**军团事件**（北境战帅率12~48人混编部队列阵——8~10波，每波为一支**敌阵小队**（打头兵种+北境战兵照应，部分波有号令队长），战帅带亲兵压阵，每阵掉骑士装备，可反复刷，40人概率最大）与更多游魂敌人；**敌阵系统**：成建制敌人同场协作（号令/同型连携/盾阵），玩家可切换目标与横扫，接入灰衣骑士小队（队长+双骑士）、黑棘战团长/要塞逃将/黑棘城主（带亲兵）、古战场游魂集群；委托完成后不再跳转告示板（保留当前游荡进度，交差按钮仍在告示板）；营地/歇脚/扎营休息现在也会给队友回血；观海镇⇄鹿鸣镇五段路；新增敌人（无头战魂/黑原鬣犬/北境战帅等）；新增 `/骑士` `/狮子` `/双狮` `/活` `/渡` `/兰` `/卡` `/北港` `/霜` `/银` `/塞` `/黑` `/北望` `/观` `/黑原` `/北古`
- **0.23**：寻踪系统（BOSS 委托不再告知地点，野外游荡偶遇 BOSS 房）、购买武器/装备改为入背包（营地手动装备）、锻造材质由首个辅料决定、通用「管理者材料」（攻+80/防+80）、区域龙（赤河/泥沼/旱地/墓岩/渡河龙）、商店跳转修复、战斗意图预告+敌人格挡+队友指挥与生命值、主城歇脚、数值与体力规则标注、「铜币」统一叫法、武器显示「伤害+X」
- **0.22**：七座城镇（含正常地区白石镇、沿海风角港）、大马士革刀 7200 铜币/+50、精炼熔断钢铁、龙巢无限下潜肉鸽与第 50 层裂纹的臂甲、巨鲸之泉龙
- 更早：四/五城扩张、连环与高危委托、多材料锻造、打字机效果、存档码导入导出、东方武器异纹等
- 如有问题和疑惑欢迎给我的邮箱；en114514896@outlook.com
- 或者直接发送到我的qq； 195048316





# ISOLDE (0.25)

A single-file dark medieval fantasy text game.

> This repository contains only the game itself and its automated test scripts. It does not include any build tools or dependencies. **The game itself has zero dependencies and requires no installation.**

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
* The title screen displays the current version number (currently `0.25`)

---

## 3. Gameplay Overview

* **Interface**: Terminal-style UI. Text is displayed character by character (the "Typewriter Effect" can be disabled in the system menu). Action buttons are displayed below, with a command input box at the bottom.

* **Combat**: Turn-based. Attack · Front (×0.8) / Side (×1.3) / Stab the Abdomen (weak point) / Team-up (companion coordination, +15% per companion) / Weapon Skill (one skill per weapon, 2-turn cooldown) / Block / Dodge / Items / Flee. **Control switching**: hand control to any party member (mercs included) in battle or from the party panel outside battle — the controlled character attacks without stamina and can use their own weapon skill (separate cooldown) and the party's learned spells (their own MP, +2 per round; heals go to the most wounded member).

* **Combat Information**: Before each turn, **"Hostility"** is displayed. Enemies telegraph their next attack and target, and may target one of your companions. Shield-bearing enemies can block, halving the damage of your next attack. Companions have HP and can be commanded to **Defend** (take half damage and temporarily stop attacking) or **Attack**. Stamina costs are shown in the combat interface and under "Help": Attack 10 · Team-up 12 · Weapon Skill varies by weapon · Block 5 · Dodge 10. When stamina falls below 10, damage is reduced by 40%.

* **Party**: After you act in each battle, every companion enters a decision phase in sequence (Combat / Defend / Dodge / Item / Flee). The **Party** panel (accessible from every town, the system menu, and camp, or by entering `队伍`) displays **companions** (Knight / Amplus / Regulus) with their level, EXP, base Attack/Defense, weapon, HP, and passive abilities. Mercenaries do not display a level. You can also **change the party leader**:

  * Protagonist — *Lead from the Front*: +1 damage to the entire party
  * Fallen Knight — *Military Morale*: +1 damage to the entire party, +1 additional damage for himself
  * Amplus — *Oath of Companionship*: companions take 1 less damage
  * Regulus — *Lionheart Throne*: +2 damage to the entire party
    Mercenaries cannot become party leader. If the party leader leaves, leadership automatically returns to the protagonist.

* **Companion Growth**: After winning a battle, all non-mercenary companions (Amplus / Knight / Regulus) share the same EXP as the protagonist. Leveling up increases their base Attack and maximum HP. **"Custom Companion Equipment" at the blacksmith improves the companions' base stats**: weapons provide +2 base Attack and can be forged 10 times; armor provides +1 base Defense and can be forged 10 times. Every 4 points of Defense automatically grant one additional Block layer.

* **Companion Weapons**: At camp, use "Change Companion Weapon" to let the Knight / Amplus / Regulus choose a weapon from your weapon inventory. **40% of the weapon's Attack is converted into damage per hit.** Weapons can also be removed. Mercenaries use their own equipment and are not included in this system.

* **Equipment**: When equipping new armor or accessories, the old equipment is automatically returned to your inventory instead of being sold or disappearing. **Forged armor goes into the Armor Bag**, where its Defense and slot are stored. You can change armor at camp using "Equip Armor", and armor is also visible through the inventory command. This prevents forged armor from appearing to enter the inventory while actually disappearing.

* **Regulus**: After reaching Level 30, a random town's bulletin board will post the quest **"Eye of the Lion."**

* **Progression**: The level cap is 1000. Levels 1–119 have steady growth; **levels 120–200 are the Golden Age**, with the strongest per-level bonuses; **after Level 200, required EXP grows exponentially (+1% per level) while stat bonuses gradually decrease**. Required EXP is `Level × 80` before Level 200. Attack milestones occur at Levels 15 / 30 / 50 / 70. Weapons display their bonus as `Damage +X`.

* **Progress**: Resting at camp = save + advance one day. Every major town has a "Rest" option that restores HP, saves the game, and advances one day. Take jobs from bulletin boards; accumulating completed jobs unlocks BOSS / advanced / high-risk / dungeon contracts.

* **Tracking**: BOSS encounters and contracts **do not directly reveal their locations**. After accepting a contract, wander outside the town until you encounter a "Tracking · ×××" scene, then enter it. If multiple quests are being tracked simultaneously, one is selected at random.

* **Equipment**: Weapons and armor purchased from shops **are added to your inventory**. Equip them manually at camp using "Change Weapon" or "Equip Armor". They are no longer automatically equipped, and old equipment is no longer automatically sold at a reduced price.

* **Smithing**: Customize weapons and armor at the blacksmith. You can stack up to **20 supplementary materials** (affixes, attack bonuses, and quality guarantees all stack). **The first supplementary material determines the armor's material** — for example, putting Dragon Scale in first produces Dragon Scale Armor. "Smelt Refined Steel" produces materials for Damascus blades. **Administrator Materials** provide +80 Attack for weapons and +80 Defense for armor.

* **Dragons**: The Ancient Dragon — a battle requiring everything you've got → regional dragons (Red River Dragon / Swamp Dragon / Dryland Dragon / Grave Rock Dragon / River-Crossing Dragon), all of which can be defeated.

* **Legendary Knights**: Starting at Level 15, one legendary knight may be encountered while wandering the outskirts of each of the seven towns. Once defeated, they do not respawn, and you can flee from them:

  * **Fell Knight Phylos** — Ashwood · Tear-Eroded
  * **Corrupted Knight Domingo** — Cromford · Venom-Eroded
  * **Broken-Bow Knight Mateo** — Tanwo · Broken-Bow Demon Arrow
  * **Pale Knight Silas** — Lienfield · Undead · Revives twice
  * **Cold-Iron Knight Veronica** — Wolin · Freeze
  * **Broken-Sword Knight Cesar** — Whitestone · Broken Sword / Iron Fist
  * **Whalebone Knight Joaquin** — Cape Horn Harbor · Whale Oil · Fear of Fire
    Each knight drops a unique weapon and forging materials, with some also dropping accessories or armor materials.

* **Elite Drops**: Elite and BOSS enemies have a chance to drop exclusive equipment after battle. Weapons go into your inventory and can be equipped at camp; armor and materials go into your inventory for equipping or forging.

* **Dragon's Nest Roguelike**: Complete the "Explore the Dragon's Nest" contract in Cape Horn Harbor to unlock **"Depths of the Dragon's Nest · Infinite Descent"** — with unlimited floors.

* **Death**: After a nightmare, you return to camp. Your save is not deleted.

### Towns and Roads (Chapter 1 · Southern Frontier)

Ashwood (Blood Plague) → Cromford (Frog Plague) → Tanwo (Lice Plague) → Whitestone (Normal Region) → Lienfield (Fly Plague) → Wolin (Livestock Plague) → Cape Horn Harbor (Coastal · Non-Plague Region) → Ferry Town (Transit) → Ancient Battlefield (Haunted Region) → **Randall (Sore Plague · Hub)** → Calvo (Hail Plague · Northern Gate)

North of Calvo lies Stern (Locust Plague), which belongs to Chapter 2 and is currently unavailable.

* **Three Hub Towns**: Stonebridge / Grayrock / Whitewater. Located along the route to Randall, each serves as a branching hub connecting multiple towns. They also provide direct routes to old plague regions: Stonebridge ⇄ Wolin, Grayrock ⇄ Lienfield, Whitewater ⇄ Whitestone.

* **Eastern Sea Route**: Mountains block the way north from Randall. Travel east through East Ridge → Songwind → Cliffside → Bluestone → Northspring → Tidehymn Harbor. Four additional towns branch off along the route: White Mist / Deercry / Echoing Water / Seaview. After completing the main quest **"Clear the Harbor Route"**, you can take a ship across the Northern Ridge Sea to North Ridge Harbor (5 segments; sea wolves, pirates, or sirens may attack). Continue through Frostvale → Silvershield, then pass through Graywall Fortress. The garrison will inspect you, requiring a battle, though you can also take the mountain pass around the western side. From there you can reach Calvo.

* **Sea Route Connections**: After clearing the harbor route, Tidehymn Harbor ⇄ North Ridge Harbor ⇄ Cape Horn Harbor become connected by ship, with all three routes taking 5 segments.

* **Northern High-Risk Zone**: Six segments north of Northwatch lies Blackthorn City. Its bulletin board offers 24 high-risk contracts: 8 repeatable and 16 one-time contracts. The ultimate target is the Lord of Blackthorn City. Six segments west of Blackthorn City leads to Cape Horn Harbor. Two segments south leads into the Black Plains. Farther south lies the Northern Ancient Battlefield, where you can encounter the powerful high-risk BOSS **Northern Warlord**. There is also a **Legion Event**: the Northern Warlord leads a mixed force of 12–48 soldiers into a series of battles against you. The lineup consists of Northern Soldiers / Oathbreak Knights / Battlefield Spirits / Headless War Souls / Banner Wraiths / Fortress Runaways. A force of 40 has the highest probability.

* **Ancient Battlefield Area**:

  * Northwatch — north: Randall / east: Wasteland / Blackthorn City
  * South Tomb — south: Ferry Town / Stonebridge
  * Eastern Wasteland — east: wilderness area, with a route to East Ridge

* **Bulletin Boards**: Every newly added town has 4 delivery contracts + 4 general bounties (Mountain Bandits / Salt Smugglers / Wolf Packs / Routed Soldiers). These begin combat immediately and can be repeated.

* **Roads**: Travel between towns takes multiple segments (3 segments per journey). Along the way, you can set up camp, explore, or encounter regional events. Roads are no longer one-way; hub towns provide branching routes to multiple destinations.

* **Map**: Enter `地图` or press the "Map" button in the system menu or at new towns to view the world map. The current town is highlighted in gold.

---

## 4. Command Input

Commands can be entered at any time. Commands **without a slash** are player commands, while commands **with a slash** are developer commands:

| Command                        | Effect                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `看`                            | Re-display the current scene description                                                                                                   |
| `状态` / `背包` / `帮助`             | Open the corresponding panel                                                                                                               |
| `敌情`                           | View enemy stats during combat                                                                                                             |
| `/dev`                         | List all developer commands                                                                                                                |
| `/钱 数量` `/级 数量` `/item 名称 数量`  | Add resources                                                                                                                              |
| `/管理员 数量` (`/管理` also works)   | Add Administrator Materials (forging material: +80 Attack for weapons / +80 Defense for armor)                                             |
| `/heal` `/god` `/kill` `/天 数量` | Fully heal / toggle invincibility / instantly kill / skip days                                                                             |
| `/活 数量`                        | Directly set the number of completed jobs (unlocks major bulletin-board contracts)                                                         |
| `/通缉` `/清人` `/reset`           | Toggle wanted status / remove all companions / reset                                                                                       |
| `/克` `/坦` `/利` `/沃` `/白` `/风`  | Instantly travel to the corresponding town                                                                                                 |
| `/龙` `/赤龙`                     | Trigger the Ancient Dragon / Level 40 Red River Dragon                                                                                     |
| `/狮子` `/双狮`                    | Set up the prerequisites (Level 30 + five relics + Lionheart Sword) / directly start the Twin Lions Trial                                  |
| `/骑士 N`                        | Directly challenge a Legendary Knight (1 Fell / 2 Corrupted / 3 Broken-Bow / 4 Pale / 5 Cold-Iron / 6 Broken-Sword / 7 Whalebone)          |
| `/军团`                          | Trigger the Northern Ancient Battlefield special event: the Northern Warlord leads a mixed force of 12–48 soldiers into sequential battles |
| `/安普` `/妖僧`                    | Directly summon Ampthis / the Mad Monk Lasputi (wandering-boss fights)                                                                             |

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

* **0.25**: **Warlord Orders now drop only from high-risk foes** — Blackthorn high-risk contracts, the seven cities' extreme-danger bounties, liberation-war tyrants, Legendary Knights, and peak-level BOSSes carry them; ordinary enemies no longer drop them (a hint appears after the first such battle). **Bestiary and battle record** (`图鉴` command + system-menu button: total kills, per-enemy kill counts and first-seen day, high-risk badge, orders collected). **Ally skills and spells**: controlled allies and allies in their decision phase can now unleash their own weapon's skill (independent cooldown) and cast any spell the protagonist has learned (each ally has their own MP, recovering 2 per round; heals automatically target the most wounded member). **Regulus's spell pool**: six lion/star-themed body-strengthening spells (Lionheart Pulse: heal 30% HP / Starlight Aegis: -4 damage taken this battle / Lion King's Strength: +6 attack this battle / Star-Hunter's Eye: 15% chance to stun on hit / Falling-Star Step: regenerate 5 HP per round / Lion's Roar: stun the target and reduce its attack by 3), reset each battle. **Control can also be switched outside battle** via the party panel and carries into the next fight (status bar shows the controlled character). **Liberation wars moved into the cities**: the city tyrant takedown and the liberation war are now fought directly from the town's bulletin board (the warlord's minions live in the city), while surrounding-town liberation quests remain wilderness hunts. **Spell shops expanded**: purchasable spell books grow from 2 to 11 (general store ×8: Fire Tongue / Frost Blade / Stone Fist / Icicle / Thorn Bind / Healing Current / Thunder Strike / Frost Mist; exotic merchant ×3: Scorching Ray / Life Siphon / Scorching Nova), with new drain (Life Siphon) and party-wide heal (Healing Current) effects — 14 spells in total. **Accessory system**: up to 6 equipped at once, duplicates allowed, six quality tiers (Common / Fine / Superior / Epic / Masterforged / Hunting Trophy) — sold in shops, trophies drop from BOSSes, and the blacksmith forges the unique Masterforged "Oath of the North Return" (only one in Chapter 1); effects feed attack / damage reduction / lifesteal / undead-slaying / regen / stat caps. **Camp cooking and alchemy**: 8 dishes (Iron Bone Soup / Blazing Beast Meat / Mycelium Fish Soup grant per-battle attack/defense/dodge buffs that decay each battle), 7 alchemy products (Health Potion / Strength Potion / Hardskin Potion / Swiftness Potion / Purge Potion / Dragon-Breath Fire Bottle / Blood-Salt Weapon Poison — poison adds bleed on 5 hits). **Spells expanded to 20** (Wind Blade / Stone Rain / Purifying Light / Deep Sleep / Earthen Shield / Amplify). **Official release**: "prototype" removed from the title and documentation. Status panel stale text fixed (spell list and the 1000-level cap). **Control-school spells** (Fear / Weakness Curse / Slowness Curse / Armor-Break Curse / Plague Curse / Bad-Luck Curse / Phantom / Soothing Illusion / Despair Curse — enemy-side attack-/defense-/plague/luck debuffs, 29 spells total). **Spell memory slots** (3/5/8/12/15 by level, memorize/forget at camp). **Legendary weapons**: Tyrfing (Ashwold manor ruins — merges into the body, +damage with the Oath-of-Slaying curse), Fragarach (Tanwo's Ash-Dust Highland Dragon BOSS — auto-first-strike + never-healing wounds), Brionac (Warrin's Enchanted-Man BOSS — five-ray volley, pacified by Poppy Sleeping Draught from alchemy). **More accessories** (multi-hit rings ×2/×3/×4/×5/×10, a reload-speed ring for the far-future firearm, gold/XP charms, damage-reduction pendant). **Administrator Materials removed from weapon and accessory recipes** (armor forging keeps it; the masterforged accessory is now craftable in normal play). **Weapon-skill system rebuilt**: every weapon type has 3 skills (basic + 2nd + 3rd), unlocked by **weapon proficiency** (30/80/150/300 uses → Lv1/2/3/5; Lv4 +10% damage, Lv5 +20% damage & -10% stamina, shared across same-type weapons); heavy weapons gain a **stance system** (Greatsword/Bastard Sword: Offensive·Defensive·Breaker stances; Flame Greatsword: Super-Armor·Berserk·Magic stances, each with a bonus stance skill). **Forge rebuilt as part-by-part material selection**: pick a category, then choose materials per part (blade/grip/guard/staff body/staff head...), with material bonuses — meteor iron (precise), dragon steel (keen), ancient-battlefield iron (soul-reap), whalebone (stamina), plague bone (bleed), blood-tempered steel (bleed, Chapter 2 only); staff bodies carry school affinities (ash/yew/blessed/curse-carrier/oak); 2.1% chance of an Oriental weapon at any level. **Dragon-steel recipe**: refined damascus steel ×1 + metalclad dragonhide ×10 + dragon scale ×10 → dragon steel ×1 (smelt at the smith; blade +20% attack & keen). **New material sources**: meteor iron (exotic merchant rotating stock, small chance), ancient-battlefield iron (general store rotating stock), blood-tempered steel (Chapter-2 locked), wood/bamboo/bone/whalebone/oak/ash/yew/blessed/curse-carrier woods (general store & wizard shop). **Blackthorn wizard shop**: custom quality staves (part selection) + ready-made Curse/Blessing quality staves + more spell books (Arcane Missile / Mind Lash / Starfall, plus 12 high-damage spell books: Meteorfall / Worldflame / Absolute Zero / Thunderous Roar / Annihilation Ray / Northern Blizzard / Finger of Death / Blood Boil / Soul Annihilation / Mind Shatter / Soul Shriek / Lance of Judgment — 44 spells total). **10× forge batch**: weapon part selection and armor auxiliary materials can both take 10 pieces in one click (×10 button, effects stack per piece). **Retaking Graywall Fortress** (Calvo bulletin-board main quest, requires Calvo liberated): after the showdown with the Graywall garrison captain the fortress changes sides and becomes your base — mercenary capacity 2→6 and a training yard opens (train mercenaries: +1 damage per round & +10 HP, up to +6). **Equipment salvage** (camp: dismantle spare weapons/armor/accessories for materials). **Text speed-up** (typewriter normal/fast/off + click text to skip). **Refined steel is now epic**: weapons forged with a refined-damascus-steel blade get +20% attack and a guaranteed Epic quality. **Weapon melting**: the smith can melt spare weapons into Sharp Refined Steel, which inherits one quarter of the weapon's attack; Sharp Refined Steel is a forge material whose inherited attack is added straight onto the new weapon. **Ampthis** (Character Files §9): after completing 10 jobs in Blackthorn she appears as a wandering boss in the Blackthorn wilderness — beat her three times to attempt recruitment ("...fine. Are you done hitting me?" → follow me / leave), and she revives 480 seconds after each defeat; once recruited, her spell efficiency is 3–5× that of an ordinary mage, and 6× for hex/curse/illusion (mind and curse) spells. **Regulus ally buff** (per 16-Bosses & Legendary Units): Lock of Glory (-35% frontal damage taken), Sword-Intent buildup (+5% attack per round, max 5 stacks, -1 stack when hit), Unyielding below 50% HP (3 rounds locked at 1 HP, +30% attack), Beast-Form at 25% HP (lion phase: +50% attack, heal 30%, rending-claw bleed, 3-hit Frenzy Combo, true-damage Lion's Roar, Last Rush, Hunter's Instinct), and DYO "Crown the Nameless" (crowns the player every 4 rounds: +30% attack for 3 rounds). **Duel with Regulus** (Whitewater bulletin board, after recruiting him): a solo showdown by the Whitewater River — Lock of Glory (melee -35%), Sword-Intent, Unyielding, lion phase 2, and the Final Blow (fires below 5% HP at ×3; survive it and he collapses) — reward 150 coins plus permanent Regulus +15 attack / +5 defense. **The Mad Monk Lasputi** (wandering demon, unrecruitable): unlocked after defeating 10 knights (ask at the Blackthorn tavern), roams the whole map attacking everything; level 60–120 fluctuating, revives after 480 seconds and gains +0~5 levels per defeat (capped at 120 by Ortis's suppression); 3 fake deaths + Madder-When-Fought (+15% all stats per revival), Dark Heal / Hypnotic Gaze / Monk-Sorcery / independent left-hand casting / taunt; Ampthis raises his encounter chance +50% and deals ×1.5 to him; fire spells +30%. Drops monk-scrap pages / armor shard / madness core / poison blood, and the first kill drops the Madman's Candle (the road to Grimor). **Fixes**: heavy-weapon allies used to pick the stance-switch skill (no damage multiplier) as their combat skill and turn enemy HP into NaN (allies now pick the damaging skill); stance modifiers no longer leak onto non-heavy weapons; invalid legacy stances self-correct; enemy/ally HP auto-repairs from NaN.

* **0.24**: **Chapter 1 · Nine Plagues of the Southern Frontier** — added Ferry Town (transit), Ancient Battlefield (haunted wilderness zone), Randall (Sore Plague · hub town with routes branching to multiple towns), and Calvo (Hail Plague · northern gate and endpoint of Chapter 1). North of Calvo lies Stern, the starting area of Chapter 2. Added 18 enemy types: Gray Shell Marauder / Mine Overseer / Blacksmith Knight / Gray Shell Descendant / Sore Beast / Hail-Iron Hunter / Garrison Patrol / Lightning Rod Smith / Scorched-Earth Descendant / Hail Wolf / Battlefield Spirit / Vein Dragon / Thundercliff Dragon / Vein Colossus / Thundercliff Thunderbird / Armored Knight Ernesto / Ash Knight Ruwen / Empty Armor Knight Augustine. Added new bounties, side BOSSes, and forging materials (Hail Iron / Thunder Core / Vein Core / Ash Core / Empty Armor Core / Gray Shell Fragment / Sore Salve, etc.). **Map System** added (`地图` command + button, with the current town highlighted in gold). Regulus now appears only once; starting from the second battle, he automatically joins the party. Regulus's side quest no longer explicitly names him or mentions "relics"; the Astrologer and Lionheart Sword guidance has been strengthened. The Cracked Bracer was upgraded (Magic Damage +25% / +4 companion damage / +100 HP). Added seven Legendary Knights, five regional BOSSes, five side BOSSes, and five regional knight bounties. Elite drops were redesigned: one-time BOSSes always drop their signature weapons, while repeatable enemies have a low drop rate. **Elite enemies were strengthened**: one-time elites and bosses at Lv.20+ gain +25% HP / +15% Attack / +30% EXP (Legendary Knights and peak-level BOSSes are unchanged). **Progression curve reworked**: level cap increased to 1000; HP/Stamina growth accelerates every 10 levels; Attack milestones at Lv.15 / 30 / 50 / 70; **Lv.120–200 is the Golden Age with the strongest bonuses; after Lv.200, EXP requirements grow exponentially while bonuses gradually decrease**. **Administrator Materials** added with the `/管理员` command; old names "Administrator Materials / Administrator Items" are automatically merged and remain usable for forging (weapons +80 Attack / armor +80 Defense). Fixed the Blackthorn City bulletin-board and camp-return errors. **Armor Bag** added: forged armor no longer "disappears after entering the inventory" — it is stored in the Armor Bag and can be viewed from the camp's armor menu or the inventory command; unequipped armor is also returned to the bag. **Party System** added: "Change Companion Weapon" at camp (40% of weapon Attack converted into damage per hit, excluding mercenaries), companion forging at the blacksmith now increases base Attack/Defense (weapons +2 Attack ×10 forging / armor +1 Defense ×10 forging, every 4 Defense = 1 Block layer), Regulus's base Attack/Defense is 20 higher than the protagonist's at the same level and recalculated as he levels, and the Party panel now displays companion level / Attack / Defense / weapon (mercenaries do not display levels). Added party leader switching, shared companion EXP, and equipment returning to the inventory. Added three hub towns (Stonebridge / Grayrock / Whitewater) and the eastern port chain (East Ridge → Songwind → Cliffside → Bluestone → Northspring → Tidehymn Harbor; after clearing the harbor route, take a ship to North Ridge Harbor → Frostvale → Silvershield → Graywall Fortress → Calvo). The three ports are interconnected by sea routes (Tidehymn Harbor ⇄ North Ridge Harbor ⇄ Cape Horn Harbor). Added the **Northern High-Risk Zone**: Blackthorn City with 24 high-risk contracts (8 repeatable + 16 one-time), enhanced high-risk enemies with unique abilities, and the Lord of Blackthorn City as the ultimate target. Blackthorn City is six segments west of Cape Horn Harbor. Added the **Legion Event** to the Northern Ancient Battlefield (Northern Warlord leads a mixed force of 12–48 soldiers into sequential battles; 40 is the most likely size: Northern Soldiers / Oathbreak Knights / Battlefield Spirits / Headless War Souls / Banner Wraiths / Fortress Runaways; Northern Soldiers have half HP). Added the five-segment Seaview ⇄ Deercry route. Added new enemies including Headless War Souls, Black Plains Hounds, and the Northern Warlord. Added commands `/骑士`, `/狮子`, `/双狮`, `/活`, `/渡`, `/兰`, `/卡`, `/北港`, `/霜`, `/银`, `/塞`, `/黑`, `/北望`, `/观`, `/黑原`, `/北古`.

* **0.23**: Added the tracking system (BOSS contracts no longer reveal their locations; wander the wilderness to encounter BOSS rooms), purchased weapons/equipment are now added to the inventory and must be manually equipped at camp, armor material is determined by the first supplementary material used in smithing, universal Administrator Materials (+80 Attack / +80 Defense), regional dragons (Red River / Swamp / Dryland / Grave Rock / River-Crossing Dragons), shop navigation fixes, combat intent previews, enemy blocking, companion commands and HP, major-town resting, displayed stat and stamina rules, unified "Copper" terminology, and weapon damage display as `Damage +X`.

* **0.22**: Seven towns (including the normal Whitestone region and coastal Cape Horn Harbor), Damascus Blade — 7,200 Copper / +50 Attack, refined steel smelting, infinite-descent Dragon's Nest roguelike mode, Floor 50 Cracked Bracer, and Giant Whale Spring Dragon.

* Earlier versions: Expansion from four/five towns, chain and high-risk contracts, multi-material smithing, typewriter effect, save-code import/export, Eastern-style weapons with unique patterns, and more.

* If you have any questions or encounter any issues, feel free to contact me by email: `en114514896@outlook.com`

* Or send me a message on QQ: `195048316`
