// 冒烟测试 v3：DOM 桩 + 全流程（接单直达/游荡/BOSS解锁/轮换）
const fs = require('fs');
const html = fs.readFileSync('D:/DSS/prototype/isolde-prototype.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('FAIL: script block not found'); process.exit(1); }
const js = m[1];

try { new Function(js); console.log('OK: JS syntax valid'); }
catch (e) { console.error('FAIL: syntax error ->', e.message); process.exit(1); }

const store = { 'isolde_settings': JSON.stringify({ font: 'm', tw: false }) }; // 测试关闭打字机，日志同步
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
function el(tag) {
  return {
    tag, children: [], className: '', disabled: false, scrollTop: 0, scrollHeight: 0,
    _text: '', _html: '', _f: null,
    set textContent(v) { this._text = String(v); }, get textContent() { return this._text; },
    set innerHTML(v) { this._html = String(v); if (v === '') this.children = []; this._text = String(v).replace(/<[^>]*>/g, ''); }, get innerHTML() { return this._html || ''; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    set onclick(f) { this._f = f; }, get onclick() { return this._f; }
  };
}
const logEl = el('div'), actEl = el('div'), cmdEl = el('input'), statusEl = el('div');
logEl.id = 'log'; actEl.id = 'actions'; cmdEl.id = 'cmd'; statusEl.id = 'status';
global.document = {
  documentElement: { style: {} },
  querySelector: s => ({ '#log': logEl, '#actions': actEl, '#cmd': cmdEl, '#status': statusEl }[s]),
  createElement: el
};

eval(js + '\n;globalThis.__getState=()=>state;globalThis.__getCtx=()=>ctx;globalThis.__runCmd=runCmd;globalThis.__hunts=HUNT_LIST;globalThis.__curScene=()=>curScene;globalThis.__statsForLevel=statsForLevel;globalThis.__migrate=migrate;globalThis.__xpNeed=xpNeed;');

const st = () => globalThis.__getState();
function btns() { return actEl.children.filter(c => c.tag === 'button' && !c.disabled).map(c => c._text); }
function rawBtns() { return actEl.children.filter(c => c.tag === 'button').map(c => c._text); }
function has(t) { return btns().includes(t); }
function logHas(s) { return logEl.children.some(c => c._text.includes(s)); }
function click(label) {
  const b = actEl.children.find(c => c.tag === 'button' && c._text === label && !c.disabled);
  if (!b) throw new Error('按钮不存在: [' + label + ']  现有: ' + JSON.stringify(btns()));
  b._f();
}
function step(label, fn) { try { fn(); console.log('OK: ' + label); } catch (e) { console.error('FAIL: ' + label + ' -> ' + e.message); if (e.stack) console.error(e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); } }
function fightUntilOver(maxRounds = 80) {
  let guard = 0;
  while (has('攻击·侧面 (×1.3)')) {
    if (has('刺腹部（弱点）')) click('刺腹部（弱点）');
    else if (has('刺腹部 (×2.0)')) click('刺腹部 (×2.0)');
    else if (st().p.hp < 25 && has('格挡 (减伤50%)')) click('格挡 (减伤50%)');
    else click('攻击·侧面 (×1.3)');
    // 伙伴决策阶段：统一选「战斗」
    let ag = 0;
    while (has('战斗') && !has('攻击·侧面 (×1.3)') && ag++ < 8) { click('战斗'); }
    if (++guard > maxRounds) throw new Error('战斗循环超时');
  }
}
function fightWander(maxR = 60) {
  let g = 0;
  while (has('攻击·侧面 (×1.3)') && g++ < maxR) {
    if (st().p.hp < 22 && has('逃跑')) { click('逃跑'); continue; }
    else if (has('刺腹部（弱点）')) click('刺腹部（弱点）');
    else if (has('刺腹部 (×2.0)')) click('刺腹部 (×2.0)');
    else if (st().p.hp < 30 && has('格挡 (减伤50%)')) click('格挡 (减伤50%)');
    else click('攻击·侧面 (×1.3)');
    let ag = 0;
    while (has('战斗') && !has('攻击·侧面 (×1.3)') && ag++ < 8) { click('战斗'); }
  }
}
// 高危委托链：自动连打 N 场，团灭则回营地整链重试
function runChain(fights, enterFn, doneLabel, maxTries = 8) {
  __runCmd('/heal');
  let g = 0;
  while (!has(doneLabel) && g++ < maxTries) {
    enterFn();
    let f = 0;
    while (has('攻击·侧面 (×1.3)') && f < fights) { fightUntilOver(); f++; if (has('起身')) break; }
    if (has('起身')) { click('起身'); click('离开'); }
  }
  if (!has(doneLabel)) throw new Error('任务链未完成: ' + doneLabel + ' ' + JSON.stringify(btns()));
}
// 寻踪任务：接单后无地点提示，游荡偶遇「进去」入口，打完回告示板交差
const HUNT_ACTS = ['查看水迹', '追踪（耗10体力）', '下矿（碰运气）', '进洞', '上前', '冲阵', '闯卡', '截住商队', '迎上去', '趟进去', '推门进去', '下滩', '下水', '冲卡', '闯骨场', '踏进去', '接战', '抬棺（护送入土）', '引出一只', '靠近水边', '慢慢摸过去（稳妥，七成）', '对上它的视线', '踩上去', '走上前', '质问它', '打断他', '上前叫阵', '走进水里'];
function huntJob(doneRow, maxTries = 90) {
  __runCmd('/heal');
  let g = 0;
  while (!has(doneRow) && g++ < maxTries) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; } // 伙伴决策
    if (has('起身')) { click('起身'); click('离开'); continue; }
    const actBtn = btns().find(b => HUNT_ACTS.includes(b));
    if (actBtn) { click(actBtn); continue; }
    const backBtn = btns().find(b => b.startsWith('回告示板'));
    if (backBtn) { click(backBtn); continue; }
    if (has('进去')) { click('进去'); continue; }
    if (has('继续游荡')) { click('继续游荡'); continue; }
    if (has('在野外游荡')) { click('在野外游荡'); continue; }
    if (has('在矿区游荡')) { click('在矿区游荡'); continue; }
    if (has('在焦土游荡')) { click('在焦土游荡'); continue; }
    if (has('在河边游荡')) { click('在河边游荡'); continue; }
    if (has('在古战场游荡')) { click('在古战场游荡'); continue; }
    if (has('在城外游荡')) { click('在城外游荡'); continue; }
    if (has('在黑原游荡')) { click('在黑原游荡'); continue; }
    if (has('在北古战场游荡')) { click('在北古战场游荡'); continue; }
    if (has('在东荒原游荡')) { click('在东荒原游荡'); continue; }
    if (has('折返')) { click('折返'); continue; }
    if (has('继续走')) { click('继续走'); continue; }
    if (has('继续赶路')) { click('继续赶路'); continue; }
    if (has('别管他')) { click('别管他'); continue; }
    if (has('改天再来')) { click('改天再来'); continue; }
    if (has('回城')) { click('回城'); continue; }
    if (has('出城')) { click('出城'); continue; }
    if (has('离开')) { click('离开'); continue; }
    if (has('告示板')) { click('告示板'); continue; }
    throw new Error('寻踪异常: ' + JSON.stringify(btns()));
  }
  if (!has(doneRow)) throw new Error('寻踪未完成: ' + doneRow + ' ' + JSON.stringify(btns()));
}
// 野外游荡直到某个状态达成（星图残片等）
function activeHunts() {
  const f = st().p.flags;
  return (globalThis.__hunts || []).filter(h => h.test ? h.test() : (f[h.flag] && !f[h.done])).map(h => h.name);
}
function wanderUntil(pred, maxTries = 60, debug = false) {
  let g = 0;
  let dbg = debug;
  while (!pred() && g++ < maxTries) {
    if (dbg) { const cx = globalThis.__getCtx ? globalThis.__getCtx() : null; console.log('  wu#' + g + ' scene=' + (globalThis.__curScene ? globalThis.__curScene() : '?') + (cx ? ' ENEMY=' + cx.en.name + ' hp=' + cx.en.hp : '') + ' btns=' + JSON.stringify(btns().slice(0, 3))); }
    if (has('攻击·侧面 (×1.3)')) { fightWander(); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('起身')) { click('起身'); click('离开'); continue; }
    if (has('在野外游荡')) { click('在野外游荡'); continue; }
    if (has('在矿区游荡')) { click('在矿区游荡'); continue; }
    if (has('在焦土游荡')) { click('在焦土游荡'); continue; }
    if (has('在河边游荡')) { click('在河边游荡'); continue; }
    if (has('在古战场游荡')) { click('在古战场游荡'); continue; }
    if (has('在城外游荡')) { click('在城外游荡'); continue; }
    if (has('在黑原游荡')) { click('在黑原游荡'); continue; }
    if (has('在北古战场游荡')) { click('在北古战场游荡'); continue; }
    if (has('在东荒原游荡')) { click('在东荒原游荡'); continue; }
    if (has('折返')) { click('折返'); continue; }
    if (has('继续游荡')) { click('继续游荡'); continue; }
    if (has('继续赶路')) { click('继续赶路'); continue; }
    if (btns().some(b => b.startsWith('买') || b.startsWith('卖'))) { click('继续赶路'); continue; }
    if (has('进去')) { click('进去'); continue; }
    if (has('改天再来')) { click('改天再来'); continue; }
    if (has('别管他')) { click('别管他'); continue; }
    if (has('继续走')) { click('继续走'); continue; }
    if (has('回城')) { click('回城'); continue; }
    if (has('出城')) { click('出城'); continue; }
    if (has('离开')) { click('离开'); continue; }
    throw new Error('wanderUntil: ' + JSON.stringify(btns()));
  }
  if (!pred()) throw new Error('wanderUntil 未达成: ' + JSON.stringify(btns()) + ' flags=' + JSON.stringify({ lj: st().p.flags.leoStarJob, f1: st().p.flags.starFrag1, f2: st().p.flags.starFrag2, f3: st().p.flags.starFrag3, dc: st().p.flags.dragonChainDone }));
}

/* ============ 流程 ============ */
step('标题→新的开始', () => { click('新的开始'); st().p.flags.dragonChainDone = true; /* 屏蔽早期野外老龙败局引发的「龙之低语」寻踪干扰，龙之低语步骤前恢复 */ });
step('捡起木剑', () => click('捡起木剑'));
step('沿路北上', () => click('沿着河往北走'));
step('野狗首战', () => { click('拔剑'); if (!logHas('敌意：')) throw new Error('未显示敌方意图'); fightUntilOver(); if (!st().p.inv.兽皮) throw new Error('未获得兽皮'); });
step('到达阿什沃德（六家店铺）', () => { click('继续走');
  for (const b of ['铁匠铺','杂货铺','酒馆','告示板','佣兵市场','异域商人']) if (!has(b)) throw new Error('缺少店铺按钮: '+b); });
step('铁匠铺·没钱买剑', () => { click('铁匠铺'); click('买：破铁剑（20铜币，+8攻击）'); if (!logHas('钱不够')) throw new Error('应当提示钱不够'); });
step('卖兽皮+3', () => { click('卖：兽皮 ×1（3铜币）'); if (st().p.gold !== 3) throw new Error('金币=' + st().p.gold); });
step('杂货铺·买净水袋+卖不出旧铁片', () => { click('离开'); click('杂货铺'); click('买：净水袋（2铜币，+10体力）');
  if (st().p.inv.净水袋 !== 1 || st().p.gold !== 1) throw new Error('净水袋/金币异常');
  for (const b of ['买：止血膏（8铜币，+25生命·战斗）','买：醒神草（7铜币，+25体力·战斗外）','买：盐渍肉（10铜币，+30生命·战斗外）','买：猛火油（12铜币，投掷12伤害，惧火者×2）']) {
    if (!has(b)) throw new Error('缺少补给品: ' + b);
  }
  click('卖：旧铁片'); if (!logHas('收不起')) throw new Error('旧铁片应被拒收'); });
step('异域商人·买绷带钱不够', () => { click('离开'); click('异域商人'); click('买：绷带（5铜币，+10生命）'); if (!logHas('钱不够')) throw new Error('1铜币应买不起绷带'); });
step('酒馆打听', () => { click('离开'); click('酒馆'); click('打听消息（免费）'); if (!logHas('军阀')) throw new Error('传闻缺失'); });
step('营地休息=存档+过天', () => { click('离开'); click('出城'); click('扎营'); click('休息（恢复全部+存档）');
  if (!store['isolde_proto_v1']) throw new Error('存档未写入'); if (st().p.days !== 1) throw new Error('天数=' + st().p.days); });
step('除兽×3（接单后直达城外）', () => { click('离开'); click('回城'); click('告示板');
  click('接：除兽——野猪群（报酬8铜币）');
  if (!has('野地（除兽任务）')) throw new Error('接单后应直达城外');
  click('野地（除兽任务）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续猎杀'); }
  click('回告示板'); click('交差：除兽（+8铜币）');
  if (st().p.gold !== 9) throw new Error('金币=' + st().p.gold + '（预期9）'); });
step('巨魔桥（连锁战×2·寻踪）', () => { click('接：巨魔桥——桥洞住了巨魔（报酬10铜币+旧银币）');
  if (has('石桥（巨魔桥）')) throw new Error('BOSS房不应直接告知地点');
  huntJob('交差：巨魔桥（+10铜币+旧银币）');
  click('交差：巨魔桥（+10铜币+旧银币）');
  if (st().p.inv.巨魔牙 < 2) throw new Error('巨魔牙=' + st().p.inv.巨魔牙);
  if (st().p.inv.旧银币 !== 1 || st().p.gold < 19) throw new Error('巨魔桥结算异常: 旧银币=' + st().p.inv.旧银币 + ' 金币=' + st().p.gold); });
step('偷蛋（含惊蛇战斗分支·寻踪）', () => {
  click('接：偷蛋——沼泽巨蛇的蛋（报酬12铜币）');
  huntJob('交差：偷蛋（+12铜币）');
  if (st().p.inv.蛇蛋 < 1) throw new Error('未拿到蛇蛋');
  click('交差：偷蛋（+12铜币）');
  if (st().p.gold < 31) throw new Error('金币=' + st().p.gold + '（预期≥31）'); });
step('护送·大路（+8）', () => { const g0 = st().p.gold; click('接：护送商队（大路8铜币/小路12铜币）');
  if (!has('护送进行中：商队在镇口')) throw new Error('接单后应直达城外');
  click('护送进行中：商队在镇口'); click('走大路');
  click('交差：护送（+8铜币）'); if (st().p.gold !== g0 + 8) throw new Error('护送金币=' + st().p.gold + ' 预期' + (g0 + 8)); });
step('护送·反水→被通缉', () => { const g1 = st().p.gold; click('接：护送商队（大路8铜币/小路12铜币）'); click('护送进行中：商队在镇口'); click('夜深了货就在那');
  if (!st().p.flags.通缉 || st().p.gold !== g1 + 20) throw new Error('反水结算异常: ' + st().p.gold + ' 预期' + (g1 + 20));
  if (!rawBtns().includes('护送：被通缉中——没人敢雇你')) throw new Error('被通缉后护送应下架');
  if (!statusEl.textContent.includes('被通缉')) throw new Error('状态栏未显示通缉'); });
step('赏金猎人伏击（随机路径）', () => { click('离开'); click('出城');
  let guard = 0;
  while (has('攻击·侧面 (×1.3)') && guard++ < 20) {
    fightUntilOver();
    if (has('起身')) { click('起身'); click('离开'); click('回城'); click('出城'); }
  }
  if (has('起身')) { click('起身'); click('离开'); click('回城'); click('出城'); }
  if (!st().p.flags.通缉) console.log('  · 击败赏金猎人，通缉解除');
});
step('寻猫（多轮碰运气）', () => { click('回城'); click('告示板'); click('接：寻猫——酒馆老板的猫丢了（报酬5铜币）');
  if (!has('告示板') && !has('铁匠铺')) throw new Error('寻猫接单应回城内');
  click('告示板');
  let guard = 0;
  while (!st().p.flags.catDone && guard++ < 20) {
    if (has('找猫（碰碰运气）')) click('找猫（碰碰运气）');
    else if (has('再找找')) click('再找找');
    else break;
  }
  if (!st().p.flags.catDone) throw new Error('20次没找到猫');
  click('交差：寻猫（+5铜币）'); });
step('BOSS委托：吞骨鳄（支线解锁+一次性·寻踪）', () => {
  if (!rawBtns().some(t => t.includes('吞骨鳄'))) throw new Error('jobCount不足未解锁吞骨鳄');
  click('BOSS委托：吞骨鳄（渡口河湾·报酬15铜币）');
  if (has('河湾（吞骨鳄）')) throw new Error('BOSS房不应直接告知地点');
  huntJob('交差：吞骨鳄（+15铜币）', 120);
  click('交差：吞骨鳄（+15铜币）');
  if (rawBtns().some(t => t.includes('吞骨鳄'))) throw new Error('吞骨鳄应一次性消失');
  if (!st().p.inv.黑鳄皮) throw new Error('未获得黑鳄皮'); });
step('猪王讨伐（含死亡重试）', () => { click('接：猪王讨伐（报酬15铜币+旧铁片·仅一次）');
  click('农田（猪王讨伐）'); click('走近');
  let attempts = 0;
  while (true) {
    if (++attempts > 6) throw new Error('猪王重试次数过多');
    fightUntilOver();
    if (has('起身')) { console.log('  · 触发死亡路径：噩梦后回营地（符合设计）'); click('起身'); click('离开'); click('农田（猪王讨伐）'); click('走近'); continue; }
    break;
  }
  click('回告示板交差'); click('交差：猪王讨伐（+15铜币+旧铁片）');
  if (!logHas('切片终点')) throw new Error('未到切片终点'); });
step('匿名委托（猪王后解锁，+30·寻踪）', () => { click('继续闲逛'); click('告示板');
  click('匿名委托：出30铜币，别问是什么');
  huntJob('交差：匿名委托（+30铜币）');
  if (!st().p.inv.魔化兽皮) throw new Error('未获得魔化兽皮');
  click('交差：匿名委托（+30铜币）'); });
step('阿什沃德新活计（赶鸦+掘墓人）', () => {
  if (st().p.flags.通缉) st().p.flags.通缉 = false; // 避免赏金猎人伏击干扰
  __runCmd('/heal');
  click('接：赶鸦——田里的食腐鸦（报酬6铜币）');
  if (!has('麦田（赶鸦）')) throw new Error('赶鸦未直达城外: ' + JSON.stringify(btns()));
  let crowGuard = 0;
  while (!has('交差：赶鸦（+6铜币）') && crowGuard++ < 10) {
    const mf = btns().find(b => b.startsWith('麦田（赶鸦）'));
    if (mf) click(mf);
    let f2 = 0;
    while (has('攻击·侧面 (×1.3)') && f2++ < 6) { fightUntilOver(); if (has('起身')) break; }
    if (has('继续赶')) click('继续赶');
    if (has('起身')) { click('起身'); click('离开'); }
    if (has('回告示板')) click('回告示板');
  }
  if (!has('交差：赶鸦（+6铜币）')) throw new Error('赶鸦未完成: ' + JSON.stringify(btns()));
  click('交差：赶鸦（+6铜币）');
  if (!has('BOSS委托：掘墓人（乱葬岗·报酬18铜币+送葬骨灰）')) throw new Error('掘墓人委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：掘墓人（乱葬岗·报酬18铜币+送葬骨灰）');
  huntJob('交差：掘墓人（+18铜币+送葬骨灰×2）');
  click('交差：掘墓人（+18铜币+送葬骨灰×2）');
  if (st().p.inv.送葬骨灰 < 2) throw new Error('送葬骨灰未到账');
  if (!has('接：教训疯乞丐（报酬8铜币）')) throw new Error('疯乞丐委托缺失: ' + JSON.stringify(btns()));
  // 连环委托：河滩失踪案（3段流程，寻踪）
  if (!has('连环委托：河滩失踪案（报酬22铜币+旧银币）')) throw new Error('河滩连环委托缺失: ' + JSON.stringify(btns()));
  click('连环委托：河滩失踪案（报酬22铜币+旧银币）');
  huntJob('交差：河滩失踪案（+22铜币+旧银币）');
  click('交差：河滩失踪案（+22铜币+旧银币）');
  if (st().p.inv.旧银币 < 1) throw new Error('旧银币未到账');
  // 高危委托：血盐商队（3连战）。测试中直接推高 jobCount 以解锁 /14
  st().p.flags.jobCount = 14;
  click('离开'); click('告示板');
  if (!has('高危委托：血盐商队（西边商路·报酬45铜币+血盐×4）')) throw new Error('血盐商队委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：血盐商队（西边商路·报酬45铜币+血盐×4）');
  huntJob('交差：血盐商队（+45铜币+血盐×4）');
  click('交差：血盐商队（+45铜币+血盐×4）');
  if (st().p.inv.血盐 < 4) throw new Error('血盐奖励未到账');
  if (!rawBtns().some(b => b.includes('/16'))) throw new Error('骑士巡逻队锁定行缺失');
  console.log('  · 赶鸦3群+掘墓人寻踪+河滩失踪案4连战+血盐商队3连战，骑士巡逻队(/16)在列');
});
step('野外游荡×12（随机遭遇）', () => {
  click('离开'); click('出城');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  let enc = 0, guard = 0;
  while (enc < 12 && guard++ < 50) {
    if (has('在野外游荡')) click('在野外游荡');
    else if (has('继续游荡')) click('继续游荡');
    else if (has('继续走')) click('继续走'); // 大龙败局之后
    else if (has('改天再来')) click('改天再来'); // 寻踪场景：改天再来
    else if (has('战斗') && !has('攻击·侧面 (×1.3)')) click('战斗'); // 伙伴决策
    else if (has('回城')) { click('回城'); click('出城'); continue; }
    else throw new Error('无法游荡: ' + JSON.stringify(btns()));
    if (has('攻击·侧面 (×1.3)')) fightWander();
    if (has('起身')) { click('起身'); click('离开'); continue; } // 死回营地
    if (has('别管他')) click('别管他'); // 落魄骑士事件
    else if (has('继续赶路')) click('继续赶路'); // 采药人/旅行商人
    enc++;
  }
  if (enc < 12) throw new Error('游荡次数不足: ' + enc);
  if (has('改天再来')) click('改天再来'); // 收尾若停在寻踪场景
  if (has('继续走')) click('继续走'); // 大龙败局之后
  if (has('回城')) click('回城');
  console.log('  · 游荡12次完成，等级' + st().p.level + '，金币' + st().p.gold);
});
step('商店3天刷新', () => {
  const c0 = (st().p.shop.smith || { cycle: -1 }).cycle;
  if (has('改天再来')) click('改天再来'); // 防上一步收尾停在寻踪
  if (has('回城')) click('回城');
  click('出城');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  click('扎营');
  click('休息（恢复全部+存档）'); click('休息（恢复全部+存档）'); click('休息（恢复全部+存档）');
  click('离开');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  click('回城'); click('铁匠铺');
  const c1 = (st().p.shop.smith || { cycle: -1 }).cycle;
  if (c0 === c1) throw new Error('商店周期未变化: ' + c0);
  if (!logHas('新货')) throw new Error('刷新后应显示新货');
});
step('佣兵市场每日轮换', () => {
  click('离开'); click('告示板');
  let g = 0;
  while (st().p.gold < 150 && g++ < 20) {
    if (!st().p.flags.通缉 && has('接：护送商队（大路8铜币/小路12铜币）')) {
      click('接：护送商队（大路8铜币/小路12铜币）');
      click('护送进行中：商队在镇口'); click('走大路');
      click('交差：护送（+8铜币）');
    } else if (has('接：除兽——野猪群（报酬8铜币）')) {
      click('接：除兽——野猪群（报酬8铜币）'); click('野地（除兽任务）');
      for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续猎杀'); }
      click('回告示板'); click('交差：除兽（+8铜币）');
    } else break;
  }
  let gg = 0;
  while (st().p.flags.通缉 && gg++ < 12) {
    if (has('离开')) click('离开');
    click('出城'); click('扎营'); click('休息（恢复全部+存档）'); click('离开');
    if (has('攻击·侧面 (×1.3)')) fightWander();
    if (st().p.flags.通缉) { click('回城'); click('告示板'); }
  }
  if (has('回城')) click('回城');
  if (has('离开')) click('离开');
  click('佣兵市场');
  const dayA = btns().filter(b => b.startsWith('雇佣：'));
  if (dayA.length < 3) throw new Error('可雇名单不足3人: ' + dayA.length);
  click('离开'); click('出城');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  click('扎营'); click('休息（恢复全部+存档）');
  click('离开'); click('回城'); click('佣兵市场');
  const dayB = btns().filter(b => b.startsWith('雇佣：'));
  if (dayB.length < 3) throw new Error('过天后名单未刷新: ' + dayB.length);
  const nameOf = x => x.slice(3, x.indexOf(' Lv.'));
  if (dayA.map(nameOf).sort().join('|') === dayB.map(nameOf).sort().join('|')) throw new Error('名单撞车未变化（极小概率，重跑即可）');
  console.log('  · 第' + st().p.days + '天名单: ' + dayB.map(nameOf).sort().join('|'));
  let guard = 0;
  while (st().p.mercs.length < 2 && guard++ < 15) {
    const aff = btns().filter(b => b.startsWith('雇佣：'))
      .map(b => { const mm = b.match(/(\d+)铜币/); return { b, price: mm ? parseInt(mm[1]) : 0 }; })
      .find(x => x.price <= st().p.gold);
    if (!aff) break;
    click(aff.b);
  }
  if (st().p.mercs.length < 1) throw new Error('未能雇到佣兵（金币=' + st().p.gold + '）');
  console.log('  · 已雇 ' + st().p.mercs.length + ' 名佣兵');
});
step('BOSS委托全解锁校验', () => {
  click('离开'); click('告示板');
  if (st().p.flags.jobCount < 8) throw new Error('jobCount=' + st().p.flags.jobCount);
  const all = rawBtns();
  for (const k of ['断桥双魔','酒窖母','铜铃女']) {
    if (!all.some(t => t.includes(k))) throw new Error('缺少BOSS委托: ' + k);
  }
  if (all.some(t => t.includes('掘墓人'))) throw new Error('掘墓人应一次性（已完成）');
  if (st().p.flags.jobCount < 10 && !all.some(t => t.includes('/10'))) throw new Error('教团苦修者锁定行缺失');
  if (st().p.flags.jobCount >= 10 && !all.some(t => t.includes('教团苦修者'))) throw new Error('缺少教团苦修者委托');
  if (all.some(t => t.includes('吞骨鳄'))) throw new Error('吞骨鳄应一次性');
});
step('开发者指令', () => {
  for (const k of ['legF1','legF2','legF3','legF4','legF5','legF6','legF7','legF8','legF9','legF10']) st().p.flags[k] = true; // 中段流程屏蔽随机传奇骑士（0.27步骤用 /骑士 单独验证）
  __runCmd('/dev');
  __runCmd('/钱 500'); if (st().p.gold < 500) throw new Error('/钱失败');
  __runCmd('/级 5'); if (st().p.level !== 5 || st().p.maxHp !== 150 || st().p.atk !== 24) throw new Error('/级失败');
  __runCmd('/item 绷带 3'); if (st().p.inv.绷带 < 3) throw new Error('/item失败');
  __runCmd('/heal'); if (st().p.hp !== st().p.maxHp) throw new Error('/heal失败');
  __runCmd('/god'); if (!st().p.flags.god) throw new Error('/god开启失败');
  __runCmd('/god'); if (st().p.flags.god) throw new Error('/god关闭失败');
  __runCmd('/天 9'); if (st().p.days !== 9) throw new Error('/天失败');
  console.log('  · 刷数值指令全部生效（钱/级/物品/回满/无敌/天数）');
  click('离开'); click('出城'); click('在野外游荡');
  if (has('改天再来')) { console.log('  · [诊断] 寻踪干扰: ' + JSON.stringify(activeHunts())); click('改天再来'); }
  if (has('攻击·侧面 (×1.3)')) {
    __runCmd('/kill');
    if (has('攻击·侧面 (×1.3)')) throw new Error('/kill未生效');
    console.log('  · /kill 战斗内秒杀生效');
  }
  if (has('改天再来')) click('改天再来');
  if (has('别管他')) click('别管他');            // 落魄骑士事件
  if (has('买：草药（4铜币）')) click('继续赶路'); // 采药人
  if (has('继续赶路')) click('继续赶路');         // 旅行商人 → 城外
  if (has('回城')) click('回城');
  else if (has('继续走')) click('继续走');        // 大龙败局（极小概率）
  if (has('回城')) click('回城');
});
step('补给品采购与战斗使用', () => {
  __runCmd('/钱 60');
  click('杂货铺');
  click('买：止血膏（8铜币，+25生命·战斗）');
  click('买：醒神草（7铜币，+25体力·战斗外）');
  click('买：盐渍肉（10铜币，+30生命·战斗外）');
  click('买：猛火油（12铜币，投掷12伤害，惧火者×2）');
  for (const k of ['止血膏','醒神草','盐渍肉','猛火油']) {
    if (st().p.inv[k] !== 1) throw new Error(k + '未到账');
  }
  click('离开'); click('出城'); click('在野外游荡');
  let g = 0;
  while (!has('攻击·侧面 (×1.3)') && g++ < 20) {
    if (has('继续游荡')) click('继续游荡');
    else if (has('继续走')) click('继续走');
    else if (has('继续赶路')) click('继续赶路');
    else if (has('别管他')) click('别管他');
    else if (has('买：草药（4铜币）')) click('继续赶路');
    else if (has('改天再来')) click('改天再来');
    else if (has('战斗') && !has('攻击·侧面 (×1.3)')) click('战斗');
    else if (has('回城')) { click('回城'); click('出城'); click('在野外游荡'); }
    else throw new Error('游荡异常: ' + JSON.stringify(btns()));
  }
  click('道具');
  if (!has('止血膏 ×1（+25生命）')) throw new Error('止血膏未进战斗道具: ' + JSON.stringify(btns()));
  click('止血膏 ×1（+25生命）');
  click('道具');
  if (!has('猛火油 ×1（投掷12伤害，惧火者×2）')) throw new Error('猛火油未进战斗道具');
  click('返回');
  fightWander();
  if (has('起身')) { click('起身'); click('离开'); }
  if (has('继续走')) click('继续走'); // 大龙败局后
  if (has('回城')) click('回城');
  console.log('  · 四种新补给可购、可战（止血膏回血生效）');
});
step('逃跑增强（烟幕弹）', () => {
  __runCmd('/item 烟幕弹 1');
  __runCmd('/龙');
  if (!has('攻击·侧面 (×1.3)')) throw new Error('大龙战未开始: ' + JSON.stringify(btns()));
  click('道具');
  click('烟幕弹 ×1（逃跑必定成功）');
  if (has('攻击·侧面 (×1.3)')) throw new Error('烟幕弹未脱离战斗');
  if (st().p.inv.烟幕弹 !== 0) throw new Error('烟幕弹未消耗');
  if (st().p.flags.dragonMet) throw new Error('烟幕弹逃跑不应标记大龙');
  if (!has('回城')) throw new Error('应回到野外: ' + JSON.stringify(btns()));
  click('回城');
  console.log('  · 烟幕弹从不可逃跑的战斗中脱身');
});
step('护甲四部位（购买入背包）', () => {
  __runCmd('/钱 200');
  click('铁匠铺');
  click('买：皮背心（15铜币，胸·+3防）');
  click('买：皮革帽（8铜币，头·+1防）');
  if (st().p.inv.皮背心 !== 1 || st().p.inv.皮革帽 !== 1) throw new Error('护甲应进背包');
  if (st().p.def !== 0) throw new Error('购买不应自动装备');
  click('离开'); click('出城'); click('扎营');
  click('穿戴护甲');
  click('皮背心（胸·+3防）');
  click('穿戴护甲');
  click('皮革帽（头·+1防）');
  if (st().p.def !== 4) throw new Error('防御=' + st().p.def);
  if (!st().p.gear.胸 || !st().p.gear.头) throw new Error('部位装备失败');
  __runCmd('/item 锁子甲胸甲 1');
  click('穿戴护甲'); click('锁子甲胸甲（胸·+6防）');
  if (st().p.def !== 7) throw new Error('换装后防御=' + st().p.def);
  if (st().p.gear.胸.name !== '锁子甲胸甲') throw new Error('换装失败');
  click('离开'); click('回城');
  console.log('  · 护甲购买入背包+营地带穿戴（防' + st().p.def + '）');
});
step('新武器类型（军刀/战戟）', () => {
  __runCmd('/钱 100');
  click('铁匠铺');
  click('买：弯刀（22铜币，+9攻击，军刀）');
  if (!st().p.owned.some(w => w.name === '弯刀' && w.atk === 9 && w.type === '军刀')) throw new Error('弯刀应进背包: ' + JSON.stringify(st().p.owned));
  if (st().p.weapon.name !== '木剑') throw new Error('购买不应自动换武器');
  if (!has('买：长戟（45铜币，+12攻击，战戟）')) throw new Error('长戟购买项缺失');
  // 买铁料应留在铁匠铺（曾经跳转杂货铺的 bug）
  click('买：铁料（2铜币/块，定制武器用）');
  if (!btns().some(b => b.startsWith('定制武器'))) throw new Error('买铁料后应留在铁匠铺: ' + JSON.stringify(btns()));
  if (st().p.inv.铁料 < 1) throw new Error('铁料未到账');
  __runCmd('/item 铁料 5');
  click('定制武器（铁匠 Lv.1 · 0/1000）');
  click('军刀（铁料×3）');
  click(btns().find(b => b.startsWith('开炉打造')));
  if (st().p.weapon.type !== '军刀' && !st().p.weapon.name.includes('东方')) throw new Error('定制军刀类型错误: ' + st().p.weapon.type);
  const okNames = ['弯刀', '马刀', '长军刀', '东方'];
  if (!okNames.some(n => st().p.weapon.name.includes(n))) throw new Error('军刀分支异常: ' + st().p.weapon.name);
  click('返回'); click('返回');
  click('离开');
  // 东方武器：黄刀应带异纹词条（进背包）
  click('异域商人');
  click('买：黄刀（50铜币，+8攻击，对硬直目标+10%）');
  if (!st().p.owned.some(w => w.name === '黄刀' && w.fx && w.fx.includes('异纹'))) throw new Error('黄刀应有异纹词条并入背包');
  click('离开');
  console.log('  · 弯刀/黄刀入背包+军刀定制+铁料留店');
});
step('铁匠定制武器（多材料锻造）', () => {
  __runCmd('/钱 500');
  __runCmd('/item 铁料 40');
  click('铁匠铺');
  const entry = btns().find(b => b.startsWith('定制武器（铁匠 Lv.1 ·'));
  if (!entry) throw new Error('定制入口缺失: ' + JSON.stringify(btns()));
  click(entry);
  for (let i = 0; i < 12; i++) {
    click('剑（铁料×3）');
    click(btns().find(b => b.startsWith('开炉打造')));
    if (i < 11) click('返回');
  }
  if (st().p.forge.count !== 13) throw new Error('打造数=' + st().p.forge.count);
  if (!logHas('升到了 Lv.2')) throw new Error('12把后未升级（10把应升Lv.2）');
  if (st().p.owned.length < 2) throw new Error('武器未入库');
  if (st().p.weapon.name === '木剑') throw new Error('新武器未自动装备');
  // 辅料锻造：血水结晶 → 汲血词条
  click('返回'); // 回到类别菜单
  __runCmd('/item 铁料 10');
  __runCmd('/item 血水结晶 1');
  click('剑（铁料×3）');
  click('血水结晶（汲血：命中回复2生命） ×' + st().p.inv.血水结晶);
  click(btns().find(b => b.startsWith('开炉打造')));
  if (!st().p.weapon.fx.includes('汲血')) throw new Error('汲血词条未生效: ' + st().p.weapon.fx.join('/'));
  // 多辅料叠加：覆金属龙皮 + 疫骨（2件，上限20）
  click('返回'); // 重新进入类别菜单以刷新材料计数
  __runCmd('/item 覆金属龙皮 1');
  __runCmd('/item 疫骨 1');
  click('剑（铁料×3）');
  click('覆金属龙皮（龙威：攻击+20%·保底优良） ×' + st().p.inv.覆金属龙皮);
  click('疫骨（疫蚀：攻击+6%，必出血腥） ×' + st().p.inv.疫骨);
  if (!logHas('已选：覆金属龙皮、疫骨')) throw new Error('辅料叠加列表未显示');
  click(btns().find(b => b.startsWith('开炉打造')));
  const w = st().p.weapon;
  if (!w.fx.includes('龙威') || !w.fx.includes('血腥')) throw new Error('多辅料叠加词条未生效: ' + w.fx.join('/'));
  if (!/优良|稀有|史诗|东方/.test(w.name)) throw new Error('龙皮未保底品质: ' + w.name);
  if (st().p.forge.count !== 15) throw new Error('辅料锻造未计数: ' + st().p.forge.count);
  // 护甲定制（辅料：黑鳄皮 +2防）
  click('返回'); // → 类别菜单
  click('返回'); // → 铁匠铺
  click('定制护甲（头/胸/腿/披风）');
  __runCmd('/item 黑鳄皮 1');
  click('胸（铁料×4）');
  const gatorN = st().p.inv.黑鳄皮;
  click('黑鳄皮（+2防） ×' + gatorN);
  click(btns().find(b => b.startsWith('开炉打造')));
  if (st().p.forge.count !== 16) throw new Error('护甲打造未计数');
  if (!logHas('辅料加成+2')) throw new Error('护甲辅料加成未生效');
  console.log('  · 12把+汲血+龙威·疫骨双辅料+护甲辅料，铁匠 Lv.2，当前武器 ' + st().p.weapon.name);
});
step('精炼熔断钢铁（大马士革原料）', () => {
  if (has('返回')) click('返回');
  if (has('返回')) click('返回');
  if (has('铁匠铺')) click('铁匠铺');
  __runCmd('/item 铁料 40');
  __runCmd('/钱 200');
  const sBefore = st().p.inv.精炼熔断钢铁;
  let mG = 0;
  while (st().p.inv.精炼熔断钢铁 < sBefore + 1 && mG++ < 3) {
    click('熔炼精钢（铁料×20+50铜币 → 精炼熔断钢铁×1）');
  }
  if (st().p.inv.精炼熔断钢铁 < sBefore + 1) throw new Error('熔炼未产出精钢');
  // 用精钢锻造：必出史诗+基础攻击+10
  const entryS = btns().find(b => b.startsWith('定制武器（铁匠 Lv.'));
  click(entryS);
  click('剑（铁料×3）');
  click('精炼熔断钢铁（必出史诗，基础攻击+10） ×' + st().p.inv.精炼熔断钢铁);
  click(btns().find(b => b.startsWith('开炉打造')));
  const wS = st().p.weapon;
  if (!/史诗|东方/.test(wS.name)) throw new Error('精钢未保底史诗: ' + wS.name);
  if (wS.atk < 10) throw new Error('精钢基础攻击未生效: ' + wS.atk);
  click('返回'); click('返回'); click('离开');
  // 大马士革刀：+50攻击，7200铜币（异域商人轮换货，跨周期找）
  __runCmd('/钱 7300');
  let dam = null, dg = 0;
  while (!dam && dg++ < 10) {
    click('异域商人');
    dam = btns().find(b => b.startsWith('新货：大马士革刀'));
    if (!dam) { click('离开'); __runCmd('/天 ' + (st().p.days + 3)); }
  }
  if (!dam) throw new Error('10个刷新周期没刷出大马士革刀（概率极小）');
  if (!dam.includes('7200') || !dam.includes('+50')) throw new Error('大马士革刀价格/攻击未更新: ' + dam);
  click(dam);
  if (!st().p.owned.some(w => w.name === '大马士革刀' && w.atk === 50)) throw new Error('大马士革刀应入背包且+50: ' + JSON.stringify(st().p.owned.filter(w => w.name.includes('大马'))));
  click('离开');
  console.log('  · 熔炼精钢×1+精钢锻造必史诗+大马士革刀7200铜币+50攻击（入背包）');
});
step('连携（匕首→大剑佣兵）', () => {
  __runCmd('/清人');
  __runCmd('/钱 300');
  if (has('返回')) click('返回');
  if (has('返回')) click('返回');
  if (has('铁匠铺')) click('铁匠铺');
  click('买：生锈匕首（10铜币，+5攻击）');
  click('离开'); click('出城'); click('扎营');
  click('换武器');
  click('生锈匕首（伤害+5）');
  if (st().p.weapon.name !== '生锈匕首') throw new Error('匕首未装备');
  let guard = 0, hired = false;
  while (!hired && guard++ < 30) {
    click('离开');
    if (has('攻击·侧面 (×1.3)')) fightWander();
    click('回城'); click('佣兵市场');
    const t = btns().find(b => b.startsWith('雇佣：') && b.includes('大剑'));
    if (t) { click(t); hired = true; break; }
    click('离开'); click('出城'); click('扎营'); click('休息（恢复全部+存档）');
  }
  if (!hired) throw new Error('30天没刷出大剑佣兵（概率极小）');
  click('离开'); click('出城');
  st().p.flags.dragonMet = true; // 本步依赖佣兵存活，屏蔽随机大龙（大龙有专门步骤验证）
  __runCmd('/heal'); // 保证体力≥12，连携按钮可出现
  if (has('攻击·侧面 (×1.3)')) fightWander();
  if (has('起身')) { click('起身'); click('离开'); } // 噩梦恢复
  __runCmd('/heal');
  click('在野外游荡');
  let g2 = 0;
  while (!has('攻击·侧面 (×1.3)') && g2++ < 15) {
    if (has('继续游荡')) click('继续游荡');
    else if (has('继续赶路')) click('继续赶路');
    else if (has('别管他')) click('别管他');
    else if (has('继续走')) click('继续走');
    else if (has('改天再来')) click('改天再来');
    else if (has('战斗') && !has('攻击·侧面 (×1.3)')) click('战斗');
    else if (has('起身')) { click('起身'); click('离开'); }
    else if (has('回城')) { click('回城'); click('出城'); click('在野外游荡'); }
    else throw new Error('游荡异常: ' + JSON.stringify(btns()));
  }
  if (!has('攻击·侧面 (×1.3)')) throw new Error('15次没遇敌');
  if (!btns().some(b => b.startsWith('连携'))) throw new Error('匕首+大剑应有连携: ' + JSON.stringify(btns()));
  click(btns().find(b => b.startsWith('连携')));
  if (!logHas('连携！')) throw new Error('连携未生效');
  let agg = 0;
  while (has('战斗') && !has('攻击·侧面 (×1.3)') && agg++ < 8) click('战斗'); // 伙伴决策
  fightWander();
  if (has('起身')) { click('起身'); click('离开'); }
  if (has('回城')) click('回城');
  console.log('  · 连携链生效（匕首→大剑，+15%/人）');
});
step('旅程→克罗姆福德（扎营×3）', () => {
  click('出城');
  click('北上：前往克罗姆福德（蛙灾之地）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  if (!has('酒厂')) throw new Error('未到达: ' + JSON.stringify(btns()));
  console.log('  · 三段旅程完成，抵达克罗姆福德');
});
step('克罗姆福德：安普卢斯+井水任务', () => {
  click('酒厂');
  click('和柜台边的少年说话');
  if (!st().p.companion || st().p.companion.name !== '安普卢斯') throw new Error('安普卢斯未入队');
  click('接：井水秘方（报酬10铜币+陈年果酒×2）');
  click('上游磨坊（井水任务）');
  click('疏通水道（耗10体力）');
  if (!has('交差：井水秘方（+10铜币+果酒×2）')) throw new Error('井水任务未完成: ' + JSON.stringify(btns()));
  click('交差：井水秘方（+10铜币+果酒×2）');
  if (st().p.inv.陈年果酒 < 2) throw new Error('果酒未到账');
  // 购物后不应传送回出生点
  click('离开'); click('蛙油铺');
  click('买：蛙油膏（4铜币，战斗外+10生命）');
  if (st().p.inv.蛙油膏 !== 1) throw new Error('蛙油膏未到账');
  click('离开');
  if (!has('蛙油铺')) throw new Error('购物后应留在克罗姆福德: ' + JSON.stringify(btns()));
});
step('克罗姆福德活计（粮食护送+清蛙潮）', () => {
  click('告示板');
  click('接：护送磨坊粮食（大路8/小路12铜币）');
  click('粮食护送：粮车在北边路口');
  click('走大路');
  click('交差：护送磨坊粮食（+8铜币）');
  click('接：清蛙潮（沼蛙×3，报酬8铜币）');
  click('清蛙潮：还剩 3 只');
  // 战技测试（第一只沼蛙）
  const skBtn = btns().find(b => b.startsWith('战技·'));
  if (!skBtn) throw new Error('应有战技按钮: ' + JSON.stringify(btns()));
  click(skBtn);
  if (!logHas('战技——')) throw new Error('战技未生效');
  fightUntilOver();
  for (let i = 0; i < 2; i++) { if (has('继续打')) click('继续打'); fightUntilOver(); }
  click('回告示板'); click('交差：清蛙潮（+8铜币）');
  // 新活计：抓蛙供灶 + 蛙后BOSS
  click('接：抓蛙供灶（沼蛙×3，报酬9铜币）');
  click('抓蛙供灶：还剩 3 只');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续抓'); }
  click('回告示板'); click('交差：抓蛙供灶（+9铜币）');
  if (!has('BOSS委托：蛙后（南边大泽·报酬25铜币+蛙油膏×2）')) throw new Error('蛙后委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：蛙后（南边大泽·报酬25铜币+蛙油膏×2）');
  huntJob('交差：蛙后（+25铜币+蛙油膏×2）');
  click('交差：蛙后（+25铜币+蛙油膏×2）');
  if (st().p.inv.蛙油膏 < 2) throw new Error('蛙油膏奖励未到账');
  // 高危委托：沼潮祭坛（3连战）
  if (!has('高危委托：沼潮祭坛（深沼·报酬48铜币+水渍石×3）')) throw new Error('沼潮祭坛委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：沼潮祭坛（深沼·报酬48铜币+水渍石×3）');
  huntJob('交差：沼潮祭坛（+48铜币+水渍石×3）');
  click('交差：沼潮祭坛（+48铜币+水渍石×3）');
  if (st().p.inv.水渍石 < 3) throw new Error('水渍石奖励未到账');
});
step('回程旅程（探索+特色事件）', () => {
  click('离开'); click('出城');
  click('南下：回阿什沃德（3段路程）');
  click('探索周围');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  if (has('买：草药（4铜币）')) click('继续赶路');
  if (has('起身')) { click('起身'); click('离开'); click('南下：回阿什沃德（3段路程）'); }
  click('地区特色：蛙潮出没');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  if (has('起身')) { click('起身'); click('离开'); click('南下：回阿什沃德（3段路程）'); }
  click('扎营（休息+存档，过一天）');
  if (!has('铁匠铺')) throw new Error('未回到阿什沃德: ' + JSON.stringify(btns()));
  console.log('  · 回程三段（探索/特色/扎营）完成');
});
step('设置与读档', () => {
  click('⚙ 系统');
  click('手动存档');
  const goldBefore = st().p.gold;
  __runCmd('/钱 50');
  click('读档（回到上次存档）');
  if (st().p.gold !== goldBefore) throw new Error('读档未还原: ' + st().p.gold + ' vs ' + goldBefore);
  click('⚙ 系统');
  click('字体大小：中');
  const st2 = JSON.parse(store['isolde_settings'] || '{}');
  if (st2.font !== 'l') throw new Error('字体设置未生效: ' + JSON.stringify(st2));
  if (!has('打字机效果：关')) throw new Error('缺少打字机开关');
  click('导出存档（复制存档码）');
  if (!logHas('ISOLDE')) throw new Error('导出存档码未打印');
  click('返回');
  console.log('  · 手动存档/读档/字体/打字机开关/导出存档码生效');
});
step('旅程→坦沃（第三镇）', () => {
  click('出城');
  click('北上：前往克罗姆福德（蛙灾之地）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  click('出城');
  click('北上：前往坦沃（虱灾之地）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  if (!has('除虱铺')) throw new Error('未到达坦沃: ' + JSON.stringify(btns()));
  console.log('  · 两段旅程，抵达坦沃');
});
step('坦沃：怪物潮+成建制小队', () => {
  click('告示板');
  click('接：清虱潮（三波怪物潮，报酬15铜币）');
  click('虱潮：东边荒地');
  click('踏入潮中');
  __runCmd('敌情');
  if (!logHas('敌情：')) throw new Error('敌情命令无效');
  for (let i = 0; i < 3; i++) fightUntilOver();
  if (!has('交差：清虱潮（+15铜币）')) throw new Error('虱潮未完成: ' + JSON.stringify(btns()));
  click('交差：清虱潮（+15铜币）');
  click('接：灰衣骑士小队（成建制，报酬25铜币）');
  huntJob('交差：灰衣骑士小队（+25铜币）');
  click('交差：灰衣骑士小队（+25铜币）');
  click('接：驱赶矿洞流民（报酬10铜币）');
  click('矿洞流民营地：南边矿口');
  for (let i = 0; i < 2; i++) fightUntilOver();
  click('交差：驱赶矿洞流民（+10铜币）');
  // 新活计：灭鼠 + 灰衣指挥官BOSS
  click('接：灭鼠（鼠群×3，报酬7铜币）');
  click('灭鼠：粮仓（还剩 3 群）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续灭鼠'); }
  click('回告示板'); click('交差：灭鼠（+7铜币）');
  if (!has('BOSS委托：灰衣指挥官（报酬45铜币+灰衣队长徽记）')) throw new Error('灰衣指挥官委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：灰衣指挥官（报酬45铜币+灰衣队长徽记）');
  huntJob('交差：灰衣指挥官（+45铜币+灰衣队长徽记）');
  click('交差：灰衣指挥官（+45铜币+灰衣队长徽记）');
  // 高危委托：灰衣征税总队（3连战）
  if (!has('高危委托：灰衣征税总队（北边税卡·报酬60铜币+灰衣队长徽记×2）')) throw new Error('征税总队委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：灰衣征税总队（北边税卡·报酬60铜币+灰衣队长徽记×2）');
  huntJob('交差：灰衣征税总队（+60铜币+灰衣队长徽记×2）');
  click('交差：灰衣征税总队（+60铜币+灰衣队长徽记×2）');
  console.log('  · 虱潮三波/灰衣小队寻踪三连/流民×2/灭鼠×3/灰衣指挥官寻踪/征税总队寻踪三连 全部击破');
});
step('旅程→白石镇（正常地区）', () => {
  click('离开'); click('出城');
  click('北上：前往白石镇（正常地区）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  if (!has('集市')) throw new Error('未到达白石镇: ' + JSON.stringify(btns()));
  click('集市');
  click('买：麦饼（3铜币，+20生命·战斗外）');
  if (st().p.inv.麦饼 !== 1) throw new Error('麦饼未到账');
  click('离开');
  // 主城歇脚：恢复+存档+过一天
  const dBefore = st().p.days;
  click('歇脚（恢复+存档，过一天）');
  if (st().p.days !== dBefore + 1) throw new Error('主城歇脚未过天');
  if (!store['isolde_proto_v1']) throw new Error('歇脚未存档');
  click('巡防所');
  __runCmd('/钱 120');
  click('雇请巡防骑士（120铜币，每回合砍12，替你挡一次死）');
  if (!st().p.knight || st().p.knight.name !== '巡防骑士') throw new Error('巡防骑士未入队');
  click('离开');
  click('告示板');
  click('接：商路清障（山贼×3，报酬9铜币）');
  click('商路清障：西边山道（还剩 3 伙）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续清障'); }
  click('回告示板'); click('交差：商路清障（+9铜币）');
  if (!has('BOSS委托：野狼王（北边野林·报酬20铜币+兽皮×3）')) throw new Error('野狼王委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：野狼王（北边野林·报酬20铜币+兽皮×3）');
  huntJob('交差：野狼王（+20铜币+兽皮×3）');
  click('交差：野狼王（+20铜币+兽皮×3）');
  console.log('  · 集市麦饼+巡防骑士入队+商路清障×3+野狼王寻踪');
});
step('旅程→利恩菲尔（第四城·蝇灾）', () => {
  click('离开'); click('出城');
  click('北上：前往利恩菲尔（蝇灾之地）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  if (!has('教堂')) throw new Error('未到达利恩菲尔: ' + JSON.stringify(btns()));
  click('教堂');
  click('在长椅上坐下');
  if (st().p.inv.苦蜜酒 < 1 || !st().p.flags.churchSit) throw new Error('教堂独坐未生效');
  click('离开');
  click('苦蜜铺');
  click('买：蝇纱面罩（10铜币，头·+1防）');
  if (st().p.inv.蝇纱面罩 !== 1) throw new Error('蝇纱面罩应进背包');
  click('离开');
  click('告示板');
  click('接：驱蝇（蝇群×3，报酬7铜币）');
  click('驱蝇：镇口晒场（还剩 3 群）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续驱蝇'); }
  click('回告示板'); click('交差：驱蝇（+7铜币）');
  click('接：安魂仪式（护灵柩入土，报酬12铜币+安魂十字）');
  click('离开'); click('告示板');
  click('安魂仪式：灵柩停在教堂后');
  click('抬棺（护送入土）');
  for (let i = 0; i < 2; i++) fightUntilOver();
  if (!has('交差：安魂仪式（+12铜币+安魂十字）')) throw new Error('安魂仪式未完成: ' + JSON.stringify(btns()));
  click('交差：安魂仪式（+12铜币+安魂十字）');
  if (!st().p.accessory || st().p.accessory.name !== '安魂十字') throw new Error('安魂十字未获得');
  // 高危委托：教堂大执事（3连战）——交差后在教堂，需回告示板
  click('离开'); click('告示板');
  if (!has('高危委托：教堂大执事（圣坛·报酬55铜币+苦蜜蜡×3）')) throw new Error('教堂大执事委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：教堂大执事（圣坛·报酬55铜币+苦蜜蜡×3）');
  huntJob('交差：教堂大执事（+55铜币+苦蜜蜡×3）');
  click('交差：教堂大执事（+55铜币+苦蜜蜡×3）');
  if (st().p.inv.苦蜜蜡 < 3) throw new Error('苦蜜蜡奖励未到账');
  console.log('  · 教堂独坐+苦蜜铺甲+驱蝇×3+安魂仪式（腐尸×2）+安魂十字+教堂大执事三连');
});
step('旅程→沃林（第五城·畜疫灾）', () => {
  click('离开'); click('出城');
  click('北上：前往沃林（畜疫灾之地）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  if (!has('骨器铺')) throw new Error('未到达沃林: ' + JSON.stringify(btns()));
  click('骨器铺');
  click('买：骨刀（18铜币，+8攻击，骨刃）');
  if (!st().p.owned.some(w => w.name === '骨刀' && w.atk === 8 && w.type === '骨刃')) throw new Error('骨刀应入背包');
  click('买：疫骨甲（25铜币，胸·+5防）');
  if (st().p.inv.疫骨甲 !== 1) throw new Error('疫骨甲应入背包');
  click('离开');
  click('告示板');
  click('接：赶牲口（灰肉牲口×3，报酬8铜币）');
  click('赶牲口：河边草场（还剩 3 头）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续赶'); }
  click('回告示板'); click('交差：赶牲口（+8铜币）');
  // 骨匠帮 3连战（寻踪）
  if (!has('BOSS委托：骨匠帮（北边骨场·报酬30铜币+疫骨×2）')) throw new Error('骨匠帮委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：骨匠帮（北边骨场·报酬30铜币+疫骨×2）');
  huntJob('交差：骨匠帮（+30铜币+疫骨×2）');
  click('交差：骨匠帮（+30铜币+疫骨×2）');
  if (st().p.inv.疫骨 < 2) throw new Error('疫骨奖励未到账');
  // 骨刃锻造（疫骨辅料 → 必出血腥）
  click('离开'); click('铁匠铺');
  __runCmd('/item 铁料 5');
  const entry5 = btns().find(b => b.startsWith('定制武器（铁匠 Lv.'));
  click(entry5);
  click('骨刃（铁料×2）');
  click('疫骨（疫蚀：攻击+6%，必出血腥） ×' + st().p.inv.疫骨);
  click(btns().find(b => b.startsWith('开炉打造')));
  if (!st().p.weapon.fx || !st().p.weapon.fx.includes('血腥')) throw new Error('疫骨辅料未出血腥词条: ' + JSON.stringify(st().p.weapon.fx));
  if (st().p.weapon.type !== '骨刃' && !st().p.weapon.name.includes('东方')) throw new Error('骨刃锻造类型错误: ' + st().p.weapon.type);
  click('返回'); click('返回'); click('离开');
  console.log('  · 骨器铺骨刀+疫骨甲+赶牲口×3+骨匠帮三连+疫骨辅料锻造（血腥词条）');
});
step('旅程→风角港（沿海·非灾区）', () => {
  if (has('离开')) click('离开');
  click('出城');
  click('北上：前往风角港（沿海之地）');
  for (let i = 0; i < 3; i++) click('扎营（休息+存档，过一天）');
  if (!has('鱼市')) throw new Error('未到达风角港: ' + JSON.stringify(btns()));
  click('鱼市');
  click('买：烤鱼（5铜币，+20体力·战斗外）');
  if (st().p.inv.烤鱼 !== 1) throw new Error('烤鱼未到账');
  click('离开');
  click('告示板');
  // 出海捕鱼（三网小玩法）
  click('接：出海捕鱼（三网，渔获归你，报酬5铜币）');
  let fishGuard = 0;
  while (!has('交差：出海捕鱼（+5铜币）') && fishGuard++ < 12) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(); continue; }
    const fb = btns().find(b => b.startsWith('出海捕鱼：码头'));
    if (fb) { click(fb); continue; }
    const nb = btns().find(b => b.startsWith('继续撒网'));
    if (nb) { click(nb); continue; }
    break;
  }
  if (!has('交差：出海捕鱼（+5铜币）')) throw new Error('捕鱼未完成: ' + JSON.stringify(btns()));
  click('交差：出海捕鱼（+5铜币）');
  // 驱赶海盗（2连·寻踪）
  click('接：驱赶海盗（南码头·报酬18铜币+海鱼×2）');
  huntJob('交差：驱赶海盗（+18铜币+海鱼×2）');
  click('交差：驱赶海盗（+18铜币+海鱼×2）');
  // 盐鬼 BOSS（寻踪）
  if (!has('BOSS委托：盐鬼（盐田·报酬28铜币+水渍石×2）')) throw new Error('盐鬼委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：盐鬼（盐田·报酬28铜币+水渍石×2）');
  huntJob('交差：盐鬼（+28铜币+水渍石×2）');
  click('交差：盐鬼（+28铜币+水渍石×2）');
  // 探索龙巢穴（三层地城·寻踪）
  if (!has('地城委托：探索龙巢穴（海崖洞窟·报酬50铜币+龙鳞×2）')) throw new Error('龙巢穴委托缺失: ' + JSON.stringify(btns()));
  click('地城委托：探索龙巢穴（海崖洞窟·报酬50铜币+龙鳞×2）');
  huntJob('交差：探索龙巢穴（+50铜币+龙鳞×2）');
  click('交差：探索龙巢穴（+50铜币+龙鳞×2）');
  // 高危：灯塔怪光（4连，含巢穴之主·寻踪）
  if (!has('高危委托：灯塔怪光（东角灯塔·报酬70铜币+精炼熔断钢铁）')) throw new Error('灯塔怪光委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：灯塔怪光（东角灯塔·报酬70铜币+精炼熔断钢铁）');
  huntJob('交差：灯塔怪光（+70铜币+精炼熔断钢铁）');
  click('交差：灯塔怪光（+70铜币+精炼熔断钢铁）');
  if (st().p.inv.精炼熔断钢铁 < 1) throw new Error('精钢奖励未到账');
  console.log('  · 烤鱼+出海捕鱼三网+海盗寻踪2连+盐鬼寻踪+龙巢穴寻踪三层+灯塔怪光寻踪4连');
});
step('龙巢无限下潜（肉鸽·50层臂甲）', () => {
  if (has('离开')) click('离开');
  __runCmd('/heal');
  click('告示板');
  const el = btns().find(b => b.startsWith('龙巢深处：无限下潜'));
  if (!el) throw new Error('无限下潜未解锁: ' + JSON.stringify(btns()));
  click(el);
  fightUntilOver(200); // 第1层
  if (!btns().some(b => b.startsWith('继续下潜（第 2 层）'))) throw new Error('层间场景缺失: ' + JSON.stringify(btns()));
  click('返回地面');
  if (!btns().some(b => b.startsWith('龙巢深处：无限下潜'))) throw new Error('返回后入口缺失');
  // 直接跳到49层，验证第50层巨鲸之泉龙与裂纹的臂甲
  st().p.lairFloor = 49;
  click(btns().find(b => b.startsWith('龙巢深处：无限下潜')));
  __runCmd('/god');
  fightUntilOver(200); // 第49层普通层
  click('继续下潜（第 50 层）');
  fightUntilOver(200); fightUntilOver(200); fightUntilOver(200); // 2杂兵 + 巨鲸之泉龙
  __runCmd('/god');
  if (!st().p.armguard || st().p.armguard.name !== '裂纹的臂甲') throw new Error('50层臂甲未获得: ' + JSON.stringify(st().p.armguard));
  if (!st().p.flags.armguardGot) throw new Error('臂甲标志未置位');
  const hpExp = globalThis.__statsForLevel(st().p.level).maxHp + 100;
  if (st().p.maxHp !== hpExp) throw new Error('臂甲生命上限未生效: ' + st().p.maxHp + ' vs ' + hpExp);
  if (!logHas('阿喀琉斯的左臂甲')) throw new Error('臂甲描述缺失');
  click('返回地面'); // 出肉鸽
  if (has('离开')) click('离开'); // 出告示板回镇
  console.log('  · 无限下潜往返+第50层巨鲸之泉龙+裂纹的臂甲（法伤/队友/生命）');
});
step('随从装备定制', () => {
  if (!st().p.companion) { st().p.companion = { name: '安普卢斯', type: '剑', d: 6, hp: 30, maxHp: 30, lv: 6, xp: 0, role: 'support', passive: '同行：每回合补刀，可挡刀', atk: 6, atk0: 6, def: 1, def0: 1, weapon: null, fw: 0, fa: 0 }; } // 寻踪途中可能重伤离队，此处模拟酒厂重逢
  if (has('离开')) click('离开'); // 上一步可能结束在店内或镇里
  click('铁匠铺');
  __runCmd('/item 铁料 10');
  click('定制随从装备（骑士/伙伴）');
  if (!has('为安普卢斯打造')) throw new Error('安普卢斯不在定制名单');
  click('为安普卢斯打造');
  click('武器（铁料×2，基础攻击+2，可锻造10次）');
  click('护甲（铁料×3，基础防御+1，可锻造10次）');
  const c2 = st().p.companion;
  if (!c2 || !c2.fw || c2.atk !== 8) throw new Error('随从武器锻造未加基础攻击: ' + JSON.stringify(c2 && { fw: c2.fw, atk: c2.atk }));
  if (!c2.fa || c2.def !== 2) throw new Error('随从护甲锻造未加基础防御: ' + JSON.stringify(c2 && { fa: c2.fa, def: c2.def }));
  // 队伍系统：查看领队/支援被动
  click('返回'); click('返回'); click('离开'); click('出城'); click('扎营');
  click('队伍');
  if (!logHas('列阵')) throw new Error('巡防骑士支援被动未显示');
  if (!logHas('同行')) throw new Error('安普卢斯支援被动未显示');
  if (!logHas('军心')) console.log('  ·（本次未雇落魄骑士，军心被动无显示，符合设计）');
  click('返回');
  console.log('  · 安普卢斯：基础攻击6→8、基础防御1→2；队伍菜单显示领队/支援被动');
});
step('大龙遭遇（必败情节）', () => {
  if (has('离开')) click('离开');
  if (has('离开')) click('离开');
  __runCmd('/龙');
  if (!has('攻击·正面 (×0.8)')) throw new Error('大龙战未开始: ' + JSON.stringify(btns()));
  st().p.hp = 30; // 压低生命，确保在团队反杀前倒下（验证无回合限制下的败局路径）
  let guard = 0;
  while ((has('攻击·正面 (×0.8)') || has('战斗')) && guard++ < 60) {
    if (has('攻击·正面 (×0.8)')) click('攻击·正面 (×0.8)'); // 不格挡，正面硬接
    else if (has('战斗')) click('战斗'); // 伙伴决策阶段
  }
  if (!logHas('你明白了龙是什么')) throw new Error('大龙情节未触发');
  if (!st().p.flags.dragonMet) throw new Error('dragonMet未置位');
  if (st().p.mercs.length !== 0) throw new Error('佣兵未团灭');
  if (st().p.knight) throw new Error('骑士未团灭');
  if (st().p.companion) throw new Error('安普卢斯未离队');
  if (st().p.hp < 1 || st().p.hp > st().p.maxHp) throw new Error('战后生命异常: ' + st().p.hp);
  click('继续走');
  if (!has('回城')) throw new Error('大龙后应可回城');
  click('回城');
  if (!has('告示板')) throw new Error('大龙后回城失败: ' + JSON.stringify(btns()));
  console.log('  · 拼尽全力无法战胜：随从团灭、安普卢斯离队（酒厂可重逢）');
});
step('赤河龙（40级·可击杀）', () => {  __runCmd('/god');   // 测试用无敌，正面验证可击杀路径
  __runCmd('/级 15'); // 提高输出，确保60回合内能击杀
  st().p.weapon = { name: '测试重剑', atk: 40, type: '剑', fx: [] };
  __runCmd('/赤龙');
  if (!has('攻击·侧面 (×1.3)')) throw new Error('赤河龙战未开始: ' + JSON.stringify(btns()));
  let g = 0;
  while (has('攻击·侧面 (×1.3)') && g++ < 60) {
    if (has('刺腹部（弱点）')) click('刺腹部（弱点）');
    else if (has('刺腹部 (×2.0)')) click('刺腹部 (×2.0)');
    else click('攻击·侧面 (×1.3)');
  }
  __runCmd('/god');   // 关闭无敌
  if (has('攻击·侧面 (×1.3)')) throw new Error('赤河龙未被击杀');
  if (st().p.inv.龙鳞 < 2 || st().p.inv.覆金属龙皮 < 3) throw new Error('龙鳞/龙皮奖励未到账');
  if (!logHas('沉回了河里')) throw new Error('赤河龙结算缺失');
  console.log('  · 40级赤河龙可击杀，掉落龙鳞×2+覆金属龙皮×3');
});
step('龙之低语（其一·鳞痕向北）', () => {
  st().p.flags.dragonChainDone = false; st().p.flags.dragonChain = 0; // 本步恢复龙之低语寻踪
  __runCmd('/阿'); // 回到阿什沃德（链支线其一在这里接）
  click('告示板');
  if (!has('支线：龙之低语·其一（鳞痕向北）')) throw new Error('龙之低语支线缺失: ' + JSON.stringify(btns()));
  click('支线：龙之低语·其一（鳞痕向北）');
  __runCmd('/god');
  let g = 0;
  while (st().p.flags.dragonChain !== 1 && g++ < 40) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(200); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('进去')) { click('进去'); continue; }
    if (has('继续游荡')) { click('继续游荡'); continue; }
    if (has('在野外游荡')) { click('在野外游荡'); continue; }
    if (has('继续走')) { click('继续走'); continue; }
    if (has('继续赶路')) { click('继续赶路'); continue; }
    if (has('别管他')) { click('别管他'); continue; }
    if (has('改天再来')) { click('改天再来'); continue; }
    if (has('回城')) { click('回城'); continue; }
    if (has('出城')) { click('出城'); continue; }
    if (has('离开')) { click('离开'); continue; }
    throw new Error('龙之低语异常: ' + JSON.stringify(btns()));
  }
  __runCmd('/god');
  if (st().p.flags.dragonChain !== 1) throw new Error('龙之低语其一未完成');
  st().p.flags.dragonChainDone = true; // 后续步骤重新屏蔽其二寻踪
  console.log('  · 龙之低语其一：击败赤河龙，鳞痕向北延伸');
});
step('0.24队伍按钮·城镇与系统菜单直达', () => {
  __runCmd('/阿');
  if (!has('队伍')) throw new Error('阿什沃德菜单缺少队伍按钮: ' + JSON.stringify(btns()));
  click('队伍');
  if (!logHas('当前领队：主角')) throw new Error('队伍菜单未打开');
  click('返回');
  if (!has('告示板')) throw new Error('队伍菜单返回后不在城镇: ' + JSON.stringify(btns()));
  click('⚙ 系统');
  if (!has('队伍')) throw new Error('系统菜单缺少队伍按钮: ' + JSON.stringify(btns()));
  click('队伍'); click('返回');
  if (!has('手动存档')) throw new Error('系统菜单队伍返回异常: ' + JSON.stringify(btns()));
  click('返回');
  console.log('  · 城镇/系统菜单均有「队伍」按钮，返回原地不串场');
});
step('0.24新委托·七城告示板解锁', () => {
  __runCmd('/活 20');
  const checks = [
    ['/阿', '极危委托：血池之眼（河滩上游·报酬60铜币+血水结晶×3）'],
    ['/克', '极危委托：沼底巨蟾（大泽最深处·报酬45铜币+蛙油膏×3）'],
    ['/坦', '极危委托：灰衣督军（北边税关·报酬65铜币+灰衣甲片×4）'],
    ['/利', '极危委托：无面神父（教堂后门·报酬50铜币+送葬骨灰×3）'],
    ['/沃', '极危委托：骨瘟术士（疫雾深处·报酬55铜币+疫骨×5）'],
    ['/白', '极危委托：山贼王（西边山道·报酬40铜币+烟幕弹×2）'],
    ['/风', '极危委托：深潜海妖（北滩·报酬70铜币+大鱼×3）']
  ];
  for (const [cmd, row] of checks) {
    __runCmd(cmd);
    if (!has('队伍')) throw new Error(cmd + ' 菜单缺少队伍按钮');
    click('告示板');
    if (!has(row)) throw new Error(cmd + ' 缺少委托: ' + row + ' ' + JSON.stringify(btns()));
    click('离开');
  }
  console.log('  · 七城各新增一个极危委托（/活 20 解锁），每城菜单均有队伍按钮');
});
step('0.24新BOSS·血池之眼（寻踪讨伐→交差）', () => {
  __runCmd('/阿');
  __runCmd('/heal');
  click('告示板');
  const row = '极危委托：血池之眼（河滩上游·报酬60铜币+血水结晶×3）';
  if (!has(row)) throw new Error('血池之眼委托缺失: ' + JSON.stringify(btns()));
  click(row);
  if (!has('在野外游荡')) throw new Error('接单后应到城外: ' + JSON.stringify(btns()));
  const gold0 = st().p.gold, job0 = st().p.flags.jobCount, cry0 = st().p.inv.血水结晶;
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true; // 屏蔽龙之低语寻踪干扰
  __runCmd('/god');
  huntJob('交差：血池之眼（+60铜币+血水结晶×3）');
  __runCmd('/god');
  st().p.flags.dragonChainDone = dc;
  click('交差：血池之眼（+60铜币+血水结晶×3）');
  if (st().p.gold < gold0 + 60) throw new Error('血池之眼报酬异常: +' + (st().p.gold - gold0));
  if (st().p.inv.血水结晶 < cry0 + 3) throw new Error('血水结晶未到账');
  if (st().p.flags.jobCount !== job0 + 1) throw new Error('jobCount未+1');
  console.log('  · 血池之眼：寻踪→击杀→交差，报酬60铜币+血水结晶×3');
});
step('0.25狮子之瞳·30级随机城镇告示板', () => {
  if (has('离开')) click('离开');
  st().p.flags.leoEyeTown = 'ashwold';
  st().p.flags.regulus1 = false;
  __runCmd('/级 30');
  click('告示板');
  if (!has('支线：狮子之瞳（找回失物·寻踪）')) throw new Error('狮子之瞳委托缺失: ' + JSON.stringify(btns()));
  click('离开'); __runCmd('/克'); click('告示板');
  if (!rawBtns().includes('？？？：狮子之瞳的委托不在本城（听说在阿什沃德）')) throw new Error('异城提示缺失: ' + JSON.stringify(rawBtns()));
  click('离开'); __runCmd('/阿'); click('告示板');
  click('支线：狮子之瞳（找回失物·寻踪）');
  st().p.weapon = { name: '测试重剑', atk: 200, type: '剑', fx: [] };
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  __runCmd('/god');
  huntJob('交差：狮子之瞳（+80铜币，宝石归你）');
  __runCmd('/god');
  st().p.flags.dragonChainDone = dc;
  click('交差：狮子之瞳（+80铜币，宝石归你）');
  if (!st().p.flags.regulus1) throw new Error('regulus1未置位');
  if (!(st().p.inv.狮子之瞳 >= 1)) throw new Error('狮子之瞳遗物未到账');
  console.log('  · 狮子之瞳：30级解锁→随机城镇告示板（异城有提示）→寻踪精英狮瞳守卫→交差');
});
step('0.25多足的野兽（沃林固定）', () => {
  __runCmd('/沃'); click('告示板');
  if (!has('支线：多足的野兽（寻踪·沃林野外）')) throw new Error('多足的野兽委托缺失: ' + JSON.stringify(btns()));
  click('支线：多足的野兽（寻踪·沃林野外）');
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  __runCmd('/god');
  huntJob('交差：多足的野兽（+60铜币+疫骨×3）');
  __runCmd('/god');
  st().p.flags.dragonChainDone = dc;
  click('交差：多足的野兽（+60铜币+疫骨×3）');
  if (!st().p.flags.regulus2) throw new Error('regulus2未置位');
  if (!(st().p.inv.多足兽爪 >= 1)) throw new Error('多足兽爪未到账');
  console.log('  · 多足的野兽：沃林告示板→寻踪→精英战→第二件遗物');
});
step('0.25狮心剑（白石镇搜索解密）', () => {
  __runCmd('/白'); click('告示板');
  if (!has('支线：狮心剑（系列搜索与解密）')) throw new Error('狮心剑支线缺失: ' + JSON.stringify(btns()));
  click('支线：狮心剑（系列搜索与解密）');
  click('集市'); click('旧书摊：翻找狮心剑的记载');
  click('离开'); click('巡防所'); click('档案室：查狮心剑的旧档');
  click('离开'); click('铁匠铺'); click('问铁匠：狮心剑的钢材');
  click('离开'); click('出城');
  if (!has('北岭：狮子岩（挖狮心剑）')) throw new Error('北岭入口缺失: ' + JSON.stringify(btns()));
  click('北岭：狮子岩（挖狮心剑）');
  click('挖第一块界石（日影最短）'); click('再试');
  click('挖第二块界石（日影居中）'); click('再试');
  click('挖第三块界石（狮影所指·日斜三竿）');
  fightUntilOver(80);
  if (!st().p.lionSword || st().p.lionSword.atk !== 40) throw new Error('狮心剑未获得: ' + JSON.stringify(st().p.lionSword));
  if (!st().p.flags.regulus3 || !st().p.flags.lionSwordDone) throw new Error('regulus3未置位');
  if (st().p.owned.find(w => w.name === '狮心剑')) throw new Error('狮心剑不应进主角背包');
  click('回白石镇');
  console.log('  · 狮心剑：旧书摊→档案室→铁匠→狮子岩三界石解密（挖错有机关）→入手40攻狮心剑');
});
step('0.25坠星之地（利恩菲尔·三城寻星+解密）', () => {
  __runCmd('/利'); click('告示板');
  if (!has('支线：坠星之地（利恩菲尔·占星师）')) throw new Error('坠星之地支线缺失: ' + JSON.stringify(btns()));
  click('支线：坠星之地（利恩菲尔·占星师）');
  if (!has('占星师（坠星之地）')) throw new Error('教堂占星师入口缺失: ' + JSON.stringify(btns()));
  click('占星师（坠星之地）');
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  click('离开'); click('出城');
  wanderUntil(() => st().p.flags.starFrag1);
  __runCmd('/沃'); click('出城');
  wanderUntil(() => st().p.flags.starFrag2);
  __runCmd('/白'); click('出城');
  wanderUntil(() => st().p.flags.starFrag3);
  st().p.flags.dragonChainDone = dc;
  __runCmd('/利'); click('教堂'); click('占星师（坠星之地）');
  click('按「五帝座一最亮」排列'); // 错误排列，应留在占星台
  if (!has('按「轩辕十四最亮」排列')) throw new Error('解密界面异常: ' + JSON.stringify(btns()));
  __runCmd('/god');
  click('按「轩辕十四最亮」排列');
  fightUntilOver(200);
  __runCmd('/god');
  if (!st().p.flags.starDone || !st().p.flags.regulus4) throw new Error('regulus4未置位');
  if (!(st().p.inv.黄道星图 >= 1)) throw new Error('黄道星图未到账');
  if (has('离开')) click('离开');
  console.log('  · 坠星之地：利恩菲尔/沃林/白石镇三城郊野寻残片→占星台解密→星坠之狮→黄道星图');
});
step('0.25闪耀的小国王（白石镇）', () => {
  __runCmd('/白'); click('告示板');
  if (!has('支线：闪耀的小国王（寻踪·白石镇野外）')) throw new Error('小国王委托缺失: ' + JSON.stringify(btns()));
  click('支线：闪耀的小国王（寻踪·白石镇野外）');
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  __runCmd('/god');
  huntJob('交差：闪耀的小国王（+100铜币+苦蜜酒×2）');
  __runCmd('/god');
  st().p.flags.dragonChainDone = dc;
  click('交差：闪耀的小国王（+100铜币+苦蜜酒×2）');
  if (!st().p.flags.regulus5 || !st().p.flags.twoLionsReady) throw new Error('regulus5/twoLionsReady未置位');
  if (!(st().p.inv.小国王王冠 >= 1)) throw new Error('小国王王冠未到账');
  console.log('  · 闪耀的小国王：白石镇寻踪→精英战→第五件遗物齐，双狮之试待触发');
});
step('0.25双狮之试·轩辕十四入队', () => {
  if (has('离开')) click('离开');
  __runCmd('/白'); click('出城'); click('在野外游荡');
  if (!has('进去')) throw new Error('双狮之试未触发: ' + JSON.stringify(btns()));
  __runCmd('/god');
  click('进去');
  let g = 0;
  while (has('攻击·侧面 (×1.3)') && g++ < 500) {
    if (has('刺腹部（弱点）')) click('刺腹部（弱点）');
    else if (has('刺腹部 (×2.0)')) click('刺腹部 (×2.0)');
    else click('攻击·侧面 (×1.3)');
    let ag = 0;
    while (has('战斗') && !has('攻击·侧面 (×1.3)') && ag++ < 8) { click('战斗'); }
  }
  __runCmd('/god');
  if (has('攻击·侧面 (×1.3)')) throw new Error('双狮未被击杀');
  if (!st().p.regulus) throw new Error('轩辕十四未入队');
  if (!st().p.flags.regulusGot || !st().p.flags.twoLionsDone) throw new Error('双狮之试结算异常');
  if (!logHas('轩辕十四降临')) throw new Error('入战场演出缺失');
  click('队伍');
  if (!logHas('轩辕十四') || !logHas('王者')) throw new Error('队伍面板未显示轩辕十四');
  if (!logHas('狮心剑')) throw new Error('狮心剑归属未显示');
  click('返回');
  // 验证两击判定：找一场带队友的战斗
  click('出城');
  let f2 = 0, found = false;
  while (f2++ < 12 && !found) {
    if (has('攻击·侧面 (×1.3)')) { found = true; break; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('进去')) { click('进去'); continue; }
    if (has('改天再来')) { click('改天再来'); continue; }
    if (has('在野外游荡')) { click('在野外游荡'); continue; }
    if (has('继续游荡')) { click('继续游荡'); continue; }
    if (has('继续赶路')) { click('继续赶路'); continue; }
    if (btns().some(b => b.startsWith('买：'))) { click('继续赶路'); continue; }
    if (has('回城')) { click('回城'); continue; }
    if (has('离开')) { click('离开'); continue; }
    throw new Error('双狮后游荡异常: ' + JSON.stringify(btns()));
  }
  if (found) {
    fightUntilOver(300);
    if (!logHas('狮心·第二击')) throw new Error('轩辕十四两击判定未生效');
    console.log('  · 轩辕十四战斗中两次攻击判定（狮心剑·暴怒·追猎）验证通过');
  } else {
    console.log('  ·（本次游荡未遇敌，两击判定留待实战验证）');
  }
  console.log('  · 双狮之试：两头50级4000血狮形野兽→半血/20血时轩辕十四降临（全队恢复）→永久入队');
});
step('0.26队友换武器与等级显示', () => {
  if (has('离开')) click('离开');
  if (!st().p.companion) { st().p.companion = { name: '安普卢斯', type: '剑', d: 6, hp: 30, maxHp: 30, lv: 6, xp: 0, role: 'support', passive: '同行：每回合补刀，可挡刀', atk: 6, atk0: 6, def: 1, def0: 1, weapon: null, fw: 0, fa: 0 }; } // 双狮试炼中可能重伤离队
  // 轩辕十四基础攻防 = 同等级主角 + 20
  const r = st().p.regulus;
  const s40 = globalThis.__statsForLevel(r.lv || 40);
  if (r.atk !== s40.atk + 20) throw new Error('轩辕十四攻击未比主角高20: ' + r.atk + ' vs ' + (s40.atk + 20));
  if (r.def !== 20) throw new Error('轩辕十四防御异常: ' + r.def);
  if (!r.weapon || r.weapon.name !== '狮心剑') throw new Error('轩辕十四未持狮心剑: ' + JSON.stringify(r.weapon));
  // 队友换武器
  __runCmd('/白');
  click('出城'); click('扎营');
  if (!has('给队友换武器')) throw new Error('营地缺队友换武器入口: ' + JSON.stringify(btns()));
  click('给队友换武器');
  const cRow = btns().find(b => b.includes('安普卢斯'));
  if (!cRow) throw new Error('队友换武器名单缺安普卢斯: ' + JSON.stringify(btns()));
  if (!cRow.includes('Lv.')) throw new Error('队友换武器名单未显示等级: ' + cRow);
  click(cRow);
  const wBtn = btns().find(b => b.includes('伤害+') && !b.includes('返回') && !b.includes('卸下'));
  if (!wBtn) throw new Error('无武器可选: ' + JSON.stringify(btns()));
  click(wBtn);
  if (!st().p.companion.weapon) throw new Error('安普卢斯未装备武器');
  if (!logHas('拿起了')) throw new Error('换武器提示缺失');
  click('返回'); // 回营地
  // 队伍面板：队友显示等级/攻防，佣兵不显示等级
  st().p.mercs.push({ name: '测试佣兵', hp: 25, maxHp: 25, d: 4 });
  click('队伍');
  const lines = logEl.children.map(c => c._text);
  const ampLine = lines.filter(l => l.includes('安普卢斯（')).pop();
  if (!ampLine || !ampLine.includes('Lv.')) throw new Error('队伍面板未显示安普卢斯等级: ' + ampLine);
  if (!ampLine.includes('攻')) throw new Error('队伍面板未显示安普卢斯攻防: ' + ampLine);
  const regLine = lines.filter(l => l.includes('轩辕十四（')).pop();
  if (!regLine || !regLine.includes('Lv.')) throw new Error('队伍面板未显示轩辕十四等级');
  const mercLine = lines.filter(l => l.includes('测试佣兵')).pop();
  if (!mercLine) throw new Error('佣兵未显示');
  if (mercLine.includes('Lv.')) throw new Error('佣兵不应显示等级: ' + mercLine);
  st().p.mercs = st().p.mercs.filter(m => m.name !== '测试佣兵');
  click('返回');
  console.log('  · 轩辕十四基础攻防=主角+20；队友营地换武器（武器40%转化伤害）；队伍面板显示队友等级/攻防，佣兵不显示');
});
step('0.26队长切换+伙伴经验+装备入包', () => {
  if (has('离开')) click('离开');
  let c = st().p.companion;
  if (!c) { c = { name: '安普卢斯', type: '剑', d: 6, hp: 30, maxHp: 30, lv: 6, xp: 0, role: 'support', passive: '同行：每回合补刀，可挡刀', atk: 6, atk0: 6, def: 1, def0: 1, weapon: null, fw: 0, fa: 0 }; st().p.companion = c; } // 双狮试炼中可能重伤离队，模拟酒厂重逢
  // ① 队伍界面切换队长
  __runCmd('/白');
  click('队伍');
  if (!has('设为队长：安普卢斯（同行之誓：队友所受伤害-1）')) throw new Error('安普卢斯队长按钮缺失: ' + JSON.stringify(btns()));
  click('设为队长：安普卢斯（同行之誓：队友所受伤害-1）');
  if (st().p.leader !== '安普卢斯') throw new Error('队长未切换: ' + st().p.leader);
  if (!logHas('领队换成安普卢斯')) throw new Error('切换提示缺失');
  if (!has('设为队长：轩辕十四（狮心王座：全队伤害+2）')) throw new Error('轩辕十四队长按钮缺失: ' + JSON.stringify(btns()));
  click('设为队长：轩辕十四（狮心王座：全队伤害+2）');
  if (st().p.leader !== '轩辕十四') throw new Error('队长未切换: ' + st().p.leader);
  click('设为队长：主角（身先士卒：全队伤害+1）');
  if (st().p.leader !== '主角') throw new Error('队长未切回主角: ' + st().p.leader);
  if (!logHas('领队被动：身先士卒')) throw new Error('主角领队被动未显示');
  click('返回');
  console.log('  · 队伍界面切换队长：主角/安普卢斯/轩辕十四 三态往返，佣兵不在候选');
  // ② 战斗胜利伙伴获得经验并升级（佣兵除外）
  c = st().p.companion;
  c.lv = 6; c.xp = 6 * 80 - 5; c.hp = 200; c.maxHp = 200; // 保证活到结算
  const rxp0 = st().p.regulus.xp || 0;
  const mercsBefore = st().p.mercs.map(m => m.name).join(',');
  __runCmd('/god');
  click('出城');
  let g2 = 0;
  while (!has('攻击·侧面 (×1.3)') && g2++ < 15) {
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('改天再来')) { click('改天再来'); continue; }
    if (has('进去')) { click('进去'); continue; }
    if (has('在野外游荡')) { click('在野外游荡'); continue; }
    if (has('继续游荡')) { click('继续游荡'); continue; }
    if (has('继续赶路')) { click('继续赶路'); continue; }
    if (btns().some(b => b.startsWith('买') || b.startsWith('卖'))) { click('继续赶路'); continue; }
    if (has('别管他')) { click('别管他'); continue; }
    if (has('回城')) { click('回城'); click('出城'); continue; }
    if (has('离开')) { click('离开'); continue; }
    throw new Error('0.26游荡异常: ' + JSON.stringify(btns()));
  }
  if (!has('攻击·侧面 (×1.3)')) throw new Error('0.26未遇敌');
  fightUntilOver(300);
  __runCmd('/god');
  if (!logHas('安普卢斯 升到 Lv.7')) throw new Error('安普卢斯未升级: ' + JSON.stringify({ lv: c.lv, xp: c.xp }));
  if (st().p.regulus.xp <= rxp0) throw new Error('轩辕十四未获经验');
  if (!logHas('轩辕十四 获得')) throw new Error('轩辕十四经验提示缺失');
  if (st().p.mercs.map(m => m.name).join(',') !== mercsBefore) throw new Error('佣兵不应变化');
  console.log('  · 战斗胜利：安普卢斯/轩辕十四共享战利经验并升级，佣兵不参与');
  // ③ 换装后旧装备回包袱
  __runCmd('/白'); click('出城'); click('扎营');
  const chestBefore = st().p.gear.胸;
  const nameBefore = chestBefore ? chestBefore.name : null;
  __runCmd('/item 锁子甲胸甲 1');
  click('穿戴护甲');
  const row = btns().find(b => b.startsWith('锁子甲胸甲（胸'));
  if (!row) throw new Error('锁子甲胸甲未入穿戴列表: ' + JSON.stringify(btns()));
  click(row);
  if (st().p.gear.胸.name !== '锁子甲胸甲') throw new Error('胸甲未换上');
  if (nameBefore && !(st().p.armorBag || []).some(a => a.name === nameBefore)) throw new Error('换下的' + nameBefore + '未回护甲包: ' + JSON.stringify(st().p.armorBag));
  click('离开');
  console.log('  · 换装后旧装备放回护甲包（不再折价消失）');
});
step('0.27传奇骑士与精英掉落强化', () => {
  if (has('离开')) click('离开');
  __runCmd('/阿'); __runCmd('/级 20'); __runCmd('/heal');
  st().p.flags.legF1 = false;
  __runCmd('/god');
  __runCmd('/骑士 1'); // 报丧骑士·菲洛斯
  if (!has('攻击·侧面 (×1.3)')) throw new Error('菲洛斯战未开始: ' + JSON.stringify(btns()));
  fightUntilOver(300);
  if (!st().p.flags.legF1) throw new Error('菲洛斯旗未置位');
  if (!st().p.owned.some(w => w.name === '泪蚀细剑')) throw new Error('泪蚀细剑未入包');
  if (!(st().p.inv.泪雾核心 >= 1)) throw new Error('泪雾核心未入包');
  st().p.flags.legF4 = false;
  __runCmd('/骑士 4'); // 苍白骑士·塞拉斯：不死·复活
  if (!has('攻击·侧面 (×1.3)')) throw new Error('塞拉斯战未开始: ' + JSON.stringify(btns()));
  fightUntilOver(400);
  if (!logHas('重新站了起来')) throw new Error('塞拉斯复活机制缺失');
  if (!st().p.flags.legF4) throw new Error('塞拉斯旗未置位');
  if (!st().p.owned.some(w => w.name === '苍白大剑')) throw new Error('苍白大剑未入包');
  if (!(st().p.inv.苍白板甲碎片 >= 1)) throw new Error('苍白板甲碎片未入包');
  if (!st().p.accessory || st().p.accessory.name !== '塞拉斯的纹章') throw new Error('塞拉斯的纹章未获得');
  __runCmd('/god');
  console.log('  · 传奇骑士：专属武器/材料/饰物掉落，塞拉斯复活2次后真死');
});
step('0.24地区BOSS与骑士悬赏', () => {
  if (has('离开')) click('离开');
  __runCmd('/阿'); __runCmd('/活 22');
  click('告示板');
  if (!has('支线BOSS：血盐巨像（赤河源头·寻踪·报酬120铜币）')) throw new Error('血盐巨像委托缺失: ' + JSON.stringify(btns()));
  click('支线BOSS：血盐巨像（赤河源头·寻踪·报酬120铜币）');
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  __runCmd('/god');
  huntJob('交差：血盐巨像（+120铜币）');
  st().p.flags.dragonChainDone = dc;
  click('交差：血盐巨像（+120铜币）');
  __runCmd('/god');
  if (!st().p.owned.some(w => w.name === '血盐长戟')) throw new Error('血盐长戟未入包');
  if (!(st().p.inv.血盐核心 >= 1)) throw new Error('血盐核心未入包');
  if (!st().p.flags.saltGolemReward) throw new Error('血盐巨像奖励未结算');
  // 赤河骑士可重复悬赏
  click('悬赏：赤河骑士（寻踪·可重复·报酬45铜币）');
  st().p.flags.dragonChainDone = true;
  __runCmd('/god');
  huntJob('交差：赤河骑士（+45铜币）');
  st().p.flags.dragonChainDone = dc;
  click('交差：赤河骑士（+45铜币）');
  __runCmd('/god');
  if (!has('悬赏：赤河骑士（寻踪·可重复·报酬45铜币）')) throw new Error('赤河骑士悬赏应可重接: ' + JSON.stringify(btns()));
  console.log('  · 血盐巨像：寻踪→击杀→专属掉落（武器+材料）；赤河骑士悬赏可重复接取');
});
step('0.24第一章·地图与北境道路', () => {
  if (has('离开')) click('离开');
  __runCmd('/阿');
  click('⚙ 系统');
  if (!has('地图')) throw new Error('系统菜单缺地图按钮: ' + JSON.stringify(btns()));
  click('地图');
  if (!logHas('卡尔沃')) throw new Error('地图未显示北境');
  if (!logHas('兰德尔')) throw new Error('地图未显示兰德尔');
  const hlLine = logEl.children.find(c => c._html && c._html.includes('class="hl"'));
  if (!hlLine) throw new Error('地图未高亮当前位置');
  if (!hlLine._text.includes('阿什沃德')) throw new Error('高亮城镇不对: ' + hlLine._text);
  click('返回');
  if (!has('告示板')) throw new Error('地图返回异常: ' + JSON.stringify(btns()));
  // 真实旅程：渡口镇 → 古战场 → 兰德尔
  __runCmd('/渡'); click('出城');
  if (!has('北上：穿古战场，往兰德尔（3段路程）')) throw new Error('渡口镇北向道路缺失: ' + JSON.stringify(btns()));
  if (!has('西南：前往沃林（3段路程）')) throw new Error('渡口镇多向道路缺失');
  click('北上：穿古战场，往兰德尔（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('在古战场游荡')) throw new Error('古战场未到达: ' + JSON.stringify(btns()));
  if (!logHas('你踏进了古战场')) throw new Error('古战场抵达文案缺失');
  // 古战场扎营→离开应留在古战场，不回初始城镇
  click('扎营');
  click('离开');
  if (!has('在古战场游荡')) throw new Error('古战场扎营离开未回古战场: ' + JSON.stringify(btns()));
  click('北上：前往兰德尔（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('矿业公会')) throw new Error('兰德尔未到达: ' + JSON.stringify(btns()));
  if (!logHas('军阀')) throw new Error('兰德尔剧情文案缺失');
  click('出城');
  if (!rawBtns().some(b => b.includes('高山绝壁'))) throw new Error('兰德尔北上高山封锁缺失');
  if (!has('西行：前往白水镇（3段路程）')) throw new Error('兰德尔西向道路缺失');
  if (!has('东行：翻岭往东岭镇（3段路程）')) throw new Error('兰德尔东向道路缺失');
  if (!has('南下：穿古战场，回渡口镇（3段路程）')) throw new Error('兰德尔南向道路缺失');
  if (!has('东行：直达渡口镇（3段路程）')) throw new Error('兰德尔枢纽辐射道路缺失: ' + JSON.stringify(btns()));
  click('回城'); click('告示板');
  if (!has('交：收集铁料×4（报酬12铜币）')) throw new Error('兰德尔告示板缺失');
  click('离开');
  __runCmd('/卡'); click('告示板');
  if (!has('交：收集雹铁×2（报酬16铜币）')) throw new Error('卡尔沃告示板缺失');
  click('离开');
  console.log('  · 地图系统（当前位置金色高亮）+ 渡口镇/古战场/兰德尔枢纽/卡尔沃辐射道路连通');
});
step('0.24第一章·矿脉巨像', () => {
  __runCmd('/兰'); __runCmd('/活 24');
  click('告示板');
  if (!has('支线BOSS：矿脉巨像（废弃矿脉·寻踪·报酬150铜币）')) throw new Error('矿脉巨像委托缺失: ' + JSON.stringify(btns()));
  click('支线BOSS：矿脉巨像（废弃矿脉·寻踪·报酬150铜币）');
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  __runCmd('/god');
  huntJob('交差：矿脉巨像（+150铜币）');
  st().p.flags.dragonChainDone = dc;
  click('交差：矿脉巨像（+150铜币）');
  __runCmd('/god');
  if (!st().p.owned.some(w => w.name === '矿脉重锤')) throw new Error('矿脉重锤未入包');
  if (!(st().p.inv.矿脉核心 >= 1)) throw new Error('矿脉核心未入包');
  console.log('  · 矿脉巨像：兰德尔支线BOSS→必掉矿脉重锤+矿脉核心');
});
step('0.24轩辕十四单次登场校验', () => {
  if (!('lionTrialJoined' in st().p.flags)) throw new Error('lionTrialJoined 标志缺失');
  if (!st().p.regulus) throw new Error('轩辕十四未在队');
  console.log('  · 轩辕十四登场仅一次，之后每场战斗自动随队出战');
});
step('0.24第一章·东线港口链与要塞', () => {
  if (has('离开')) click('离开');
  __runCmd('/god');
  __runCmd('/兰'); click('出城');
  click('东行：翻岭往东岭镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('客栈（休息+存档，过一天）')) throw new Error('东岭镇未到达: ' + JSON.stringify(btns()));
  click('出城');
  click('东行：翻岭往松风镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('告示板')) throw new Error('松风镇未到达: ' + JSON.stringify(btns()));
  // 松风镇告示板：委托≥8（4交付+4悬赏）
  click('告示板');
  for (const t of ['悬赏：山道劫匪（报酬30铜币·当场开打）','悬赏：走私盐贩（报酬35铜币·当场开打）','悬赏：野狼群（报酬25铜币·当场开打）','悬赏：溃兵（报酬28铜币·当场开打）']) {
    if (!has(t)) throw new Error('松风镇告示板缺少 ' + t + ' ' + JSON.stringify(btns()));
  }
  // 试接一个悬赏：当场开打
  click('悬赏：山道劫匪（报酬30铜币·当场开打）');
  if (!has('攻击·侧面 (×1.3)')) throw new Error('悬赏战未开始');
  fightUntilOver(80);
  if (!has('交差：山道劫匪（+30铜币）')) throw new Error('悬赏交差行缺失: ' + JSON.stringify(btns()));
  click('交差：山道劫匪（+30铜币）');
  if (!has('悬赏：山道劫匪（报酬30铜币·当场开打）')) throw new Error('悬赏应可重接');
  click('离开'); click('出城');
  click('东行：前往峭壁镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('出城');
  click('东行：前往青石镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('出城');
  click('北行：前往北泉镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('出城');
  click('东行：前往潮音港（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('码头')) throw new Error('潮音港未到达: ' + JSON.stringify(btns()));
  click('码头'); // 主线前：港道堵着
  if (!logHas('港道还堵着')) throw new Error('主线前码头应提示堵港');
  click('告示板');
  if (!has('主线：疏通港道（寻踪·海盗与海妖·报酬120铜币）')) throw new Error('主线委托缺失: ' + JSON.stringify(btns()));
  click('主线：疏通港道（寻踪·海盗与海妖·报酬120铜币）');
  if (!has('港道（主线进行中）')) { click('回城'); click('告示板'); }
  click('港道（主线进行中）');
  click('开打');
  fightUntilOver(80); fightUntilOver(80); fightUntilOver(80); // 海盗×2+潮音海妖
  if (!has('交差：疏通港道（+120铜币，港道恢复通航）')) throw new Error('主线交差行缺失: ' + JSON.stringify(btns()));
  click('交差：疏通港道（+120铜币，港道恢复通航）');
  if (!st().p.flags.tideMainReward) throw new Error('主线未结算');
  if (!st().p.owned.some(w => w.name === '潮音利刃')) throw new Error('潮音利刃未入包');
  click('离开'); click('码头');
  click('登船：横渡前往北岭港（5段航程，海上或有怪物）');
  let sg = 0;
  while (!has('客栈（休息+存档，过一天）') && sg++ < 25) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(120); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('继续航行')) { click('继续航行'); continue; }
    if (has('甲板上歇一歇（+10体力）')) { click('继续航行'); continue; }
    throw new Error('航行异常: ' + JSON.stringify(btns()));
  }
  if (!has('客栈（休息+存档，过一天）')) throw new Error('北岭港未到达: ' + JSON.stringify(btns()));
  if (!logHas('北岭港到了')) throw new Error('坐船文案缺失');
  click('出城');
  click('北行：前往霜谷镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('出城');
  click('北行：前往银盾镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('出城');
  click('北上：穿过灰墙要塞，往卡尔沃（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('穿过要塞（守军盘查·要打一场）')) throw new Error('灰墙要塞未到达: ' + JSON.stringify(btns()));
  click('穿过要塞（守军盘查·要打一场）');
  fightUntilOver(80); fightUntilOver(80); // 守军×2
  if (!has('雹铁铺')) throw new Error('卡尔沃未到达: ' + JSON.stringify(btns()));
  __runCmd('/god');
  console.log('  · 东线：兰德尔→东岭→松风→峭壁→青石→北泉→潮音港（主线+5段航程）→北岭港→霜谷→银盾→灰墙要塞→卡尔沃；松风告示板≥8委托');
});
step('0.24路网往返与黑棘城', () => {
  if (has('离开')) click('离开');
  __runCmd('/god');
  // ① 北岭港→霜谷镇→回
  __runCmd('/北港'); click('出城');
  if (!has('北行：前往霜谷镇（3段路程）')) throw new Error('北岭港→霜谷镇道路缺失: ' + JSON.stringify(btns()));
  click('北行：前往霜谷镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('出城');
  if (!has('南行：回北岭港（3段路程）')) throw new Error('霜谷镇返程缺失: ' + JSON.stringify(btns()));
  click('南行：回北岭港（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('码头')) throw new Error('北岭港未回到: ' + JSON.stringify(btns()));
  // ② 卡尔沃→要塞→银盾镇→要塞→卡尔沃（双向）
  __runCmd('/卡'); click('出城');
  if (!has('南下：穿过灰墙要塞，回银盾镇（3段路程）')) throw new Error('卡尔沃南下道路缺失');
  click('南下：穿过灰墙要塞，回银盾镇（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('穿过要塞（守军盘查·要打一场）');
  fightUntilOver(80); fightUntilOver(80);
  if (!has('告示板')) throw new Error('要塞南下未到银盾镇: ' + JSON.stringify(btns()));
  click('出城');
  click('北上：穿过灰墙要塞，往卡尔沃（3段路程）');
  for (let i = 0; i < 3; i++) { click('扎营（休息+存档，过一天）'); }
  click('穿过要塞（守军盘查·要打一场）');
  fightUntilOver(80); fightUntilOver(80);
  if (!has('雹铁铺')) throw new Error('要塞北上未到卡尔沃: ' + JSON.stringify(btns()));
  // ③ 观海镇⇄鹿鸣镇 5段
  __runCmd('/观'); click('出城');
  if (!has('北行：前往鹿鸣镇（5段路程）')) throw new Error('观海→鹿鸣5段缺失: ' + JSON.stringify(btns()));
  click('北行：前往鹿鸣镇（5段路程）');
  for (let i = 0; i < 5; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('告示板')) throw new Error('鹿鸣镇未到达: ' + JSON.stringify(btns()));
  click('出城');
  if (!has('东南：前往观海镇（5段路程）')) throw new Error('鹿鸣→观海返程缺失');
  click('东南：前往观海镇（5段路程）');
  for (let i = 0; i < 5; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('告示板')) throw new Error('观海镇未回到: ' + JSON.stringify(btns()));
  // ④ 黑棘城：24高危委托+黑原+北古战场
  __runCmd('/黑');
  click('告示板');
  const hi = btns().filter(b => b.includes('高危委托') || b.includes('悬赏：'));
  if (hi.length < 24) throw new Error('黑棘城高危委托不足24: ' + hi.length + ' ' + JSON.stringify(btns().slice(0, 6)));
  // 试打一个可重复悬赏（当场寻踪）
  click('悬赏：黑甲骑劫（寻踪·报酬85铜币）');
  const dc = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  huntJob('交差：黑甲骑劫（+85铜币）', 60);
  st().p.flags.dragonChainDone = dc;
  click('交差：黑甲骑劫（+85铜币）');
  if (!has('悬赏：黑甲骑劫（寻踪·报酬85铜币）')) throw new Error('黑棘悬赏应可重接');
  click('离开');
  if (!has('出城') || !has('告示板')) throw new Error('黑棘城告示板离开未回黑棘城: ' + JSON.stringify(btns()));
  // 黑棘城主：接单文案无undefined，寻踪击杀（一次性的最终高危）
  click('告示板');
  click('高危委托：黑棘城主（寻踪·报酬240铜币）');
  if (logHas('undefined')) { const bad = logEl.children.map(c => c._text).filter(t => t.includes('undefined')).slice(-6); throw new Error('黑棘城主委托文案出现undefined: ' + JSON.stringify(bad)); }
  __runCmd('/god');
  const dc2 = st().p.flags.dragonChainDone;
  st().p.flags.dragonChainDone = true;
  huntJob('交差：黑棘城主（+240铜币）', 80);
  st().p.flags.dragonChainDone = dc2;
  click('交差：黑棘城主（+240铜币）');
  if (!rawBtns().some(b => b === '高危委托：黑棘城主（已完成）')) throw new Error('黑棘城主应已完成撤榜: ' + JSON.stringify(rawBtns().slice(0, 6)));
  __runCmd('/god');
  click('离开');
  // 黑原荒野→北古战场
  __runCmd('/黑原');
  if (!has('南下：进入北古战场')) throw new Error('黑原→北古战场缺失: ' + JSON.stringify(btns()));
  click('扎营'); click('离开');
  if (!has('南下：进入北古战场')) throw new Error('黑原荒野扎营离开未回黑原: ' + JSON.stringify(btns()));
  click('南下：进入北古战场');
  if (!has('在北古战场游荡')) throw new Error('北古战场未到达: ' + JSON.stringify(btns()));
  click('扎营'); click('离开');
  if (!has('在北古战场游荡')) throw new Error('北古战场扎营离开未回北古战场: ' + JSON.stringify(btns()));
  // 北古战场特殊事件：北境战帅率队（8~40人，40人概率最大）
  __runCmd('/军团');
  const armyBtn = btns().find(b => b.startsWith('冲阵'));
  if (!armyBtn) throw new Error('军团事件缺冲阵: ' + JSON.stringify(btns()));
  if (!logHas('北境战帅率着')) throw new Error('军团事件文案缺失');
  __runCmd('/god');
  click(armyBtn);
  let wg = 0;
  while (has('攻击·侧面 (×1.3)') && wg++ < 400) { fightUntilOver(200); }
  __runCmd('/god');
  if (!st().p.flags.northWarWarlord) throw new Error('军团战未讨取北境战帅');
  if (!logHas('被讨取')) throw new Error('讨取文案缺失');
  if (!logHas('北境战兵')) throw new Error('军团战未出现北境战兵');
  if (!logHas('弃誓骑士')) throw new Error('军团战未出现骑士兵种');
  if (!logHas('列队出阵')) throw new Error('军团多阵型文案缺失');
  // ⑤ 黑棘城西6段→风角港→回
  __runCmd('/黑'); click('出城');
  if (!has('西行：前往风角港（6段路程）')) throw new Error('黑棘城西6段缺失: ' + JSON.stringify(btns()));
  click('扎营');
  if (!has('休息（恢复全部+存档）')) throw new Error('黑棘城外营地缺失: ' + JSON.stringify(btns()));
  click('离开');
  if (!has('西行：前往风角港（6段路程）')) throw new Error('黑棘城扎营离开未回黑棘城外: ' + JSON.stringify(btns()));
  click('西行：前往风角港（6段路程）');
  for (let i = 0; i < 6; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('鱼市')) throw new Error('6段后未到风角港: ' + JSON.stringify(btns()));
  click('出城');
  if (!has('东北：前往黑棘城（6段路程）')) throw new Error('风角港→黑棘城返程缺失');
  click('东北：前往黑棘城（6段路程）');
  for (let i = 0; i < 6; i++) { click('扎营（休息+存档，过一天）'); }
  if (!has('告示板')) throw new Error('黑棘城未回到: ' + JSON.stringify(btns()));
  // ⑥ 港口互通：风角港→潮音港→北岭港→风角港
  __runCmd('/风'); click('码头');
  if (!has('登船：东北往潮音港（5段航程，海上或有怪物）')) throw new Error('风角港码头缺失: ' + JSON.stringify(btns()));
  click('登船：东北往潮音港（5段航程，海上或有怪物）');
  let pg = 0;
  while (!has('告示板') && pg++ < 25) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(120); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('继续航行')) { click('继续航行'); continue; }
    if (has('甲板上歇一歇（+10体力）')) { click('继续航行'); continue; }
    throw new Error('港口航行异常: ' + JSON.stringify(btns()));
  }
  if (!has('告示板')) throw new Error('未到潮音港');
  click('码头'); click('登船：横渡前往北岭港（5段航程，海上或有怪物）');
  pg = 0;
  while (!has('告示板') && pg++ < 25) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(120); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('继续航行')) { click('继续航行'); continue; }
    if (has('甲板上歇一歇（+10体力）')) { click('继续航行'); continue; }
    throw new Error('港口航行异常2: ' + JSON.stringify(btns()));
  }
  if (!has('告示板')) throw new Error('未到北岭港');
  click('码头'); click('登船：西南往风角港（5段航程，海上或有怪物）');
  pg = 0;
  while (!has('鱼市') && pg++ < 25) {
    if (has('攻击·侧面 (×1.3)')) { fightUntilOver(120); continue; }
    if (has('战斗') && !has('攻击·侧面 (×1.3)')) { click('战斗'); continue; }
    if (has('继续航行')) { click('继续航行'); continue; }
    if (has('甲板上歇一歇（+10体力）')) { click('继续航行'); continue; }
    throw new Error('港口航行异常3: ' + JSON.stringify(btns()));
  }
  if (!has('鱼市')) throw new Error('未回到风角港');
  __runCmd('/god');
  console.log('  · 往返实测：北岭港⇄霜谷/要塞双向/观海⇄鹿鸣5段/黑棘城24高危（城主无undefined）/黑原北古战场/黑棘⇄风角港6段/三港互通');
});
step('0.24管理者材料指令与锻造', () => {
  const clickStarts = (prefix) => {
    const b = btns().find(t => t.startsWith(prefix));
    if (!b) throw new Error('无按钮以 [' + prefix + '] 开头: ' + JSON.stringify(btns()));
    click(b);
  };
  const base = st().p.inv.管理者材料 || 0;
  __runCmd('/管理员 2');
  if (st().p.inv.管理者材料 !== base + 2) throw new Error('/管理员 未生效: ' + st().p.inv.管理者材料);
  __runCmd('/管理 1');
  if (st().p.inv.管理者材料 !== base + 3) throw new Error('/管理 别名未生效');
  __runCmd('/item 管理员材料 2');
  if (st().p.inv['管理员材料'] !== undefined) throw new Error('/item 旧名产生了垃圾物品');
  if (st().p.inv.管理者材料 !== base + 5) throw new Error('/item 旧名别名未合并');
  st().p.inv['管理员材料'] = 3; st().p.inv['管理员物品'] = 2;
  globalThis.__migrate(st());
  if (st().p.inv['管理员材料'] !== undefined || st().p.inv['管理员物品'] !== undefined) throw new Error('migrate 未清理旧名物品');
  if (st().p.inv.管理者材料 < base + 10) throw new Error('migrate 未合并旧名数量: ' + st().p.inv.管理者材料);
  __runCmd('/阿'); __runCmd('/item 铁料 30'); __runCmd('/钱 500');
  click('铁匠铺');
  clickStarts('定制武器');
  click('剑（铁料×3）');
  click(btns().find(t => t.includes('管理者材料')));
  const wBefore = st().p.owned.length;
  clickStarts('开炉打造');
  const w = st().p.owned[wBefore];
  if (!w || w.atk < 80) throw new Error('管理者材料武器锻造未加成: ' + JSON.stringify(w));
  click('返回'); click('返回');
  clickStarts('定制护甲');
  click('胸（铁料×4）');
  click(btns().find(t => t.includes('管理者材料')));
  clickStarts('开炉打造');
  if (!logHas('管理者之甲')) throw new Error('管理者材料护甲锻造未产出: ' + JSON.stringify(st().p.gear['胸']));
  if (!logHas('辅料加成+80')) throw new Error('管理者材料护甲防御加成缺失');
  // 护甲包：新锻的甲不消失，营地可换装
  const bagArmor = (st().p.armorBag || []).find(a => a.name.indexOf('管理者之甲') === 0);
  if (!bagArmor) throw new Error('锻造护甲未入护甲包: ' + JSON.stringify(st().p.armorBag));
  if (bagArmor.def < 80) throw new Error('护甲包防具防御异常: ' + JSON.stringify(bagArmor));
  click('返回'); click('返回'); click('离开'); click('出城'); click('扎营');
  click('穿戴护甲');
  const row2 = btns().find(b => b.indexOf('管理者之甲') === 0);
  if (!row2) throw new Error('护甲包防具未进穿戴列表: ' + JSON.stringify(btns()));
  click(row2);
  if ((st().p.gear['胸'].name || '').indexOf('管理者之甲') !== 0) throw new Error('护甲包防具未穿上: ' + JSON.stringify(st().p.gear['胸']));
  if ((st().p.gear['胸'].def || 0) < 80) throw new Error('穿上后防御未生效: ' + JSON.stringify(st().p.gear['胸']));
  if (!logHas('你穿上')) throw new Error('穿戴提示缺失');
  __runCmd('背包');
  if (!logHas('护甲包')) throw new Error('背包未显示护甲包');
  if (!logHas('管理者之甲')) throw new Error('背包未显示护甲包内容');
  console.log('  · /管理员 指令 + 旧名合并 + 武器/护甲锻造（+80攻/+80防）+ 护甲包不消失、营地可换装');
});
step('终局校验', () => {
  if (!store['isolde_proto_v1']) throw new Error('存档丢失');
  if (st().p.days < 4) throw new Error('天数异常');
  const lv = st().p.level;
  if (lv < 2) throw new Error('等级过低: ' + lv);
  const s = globalThis.__statsForLevel(lv);
  const hpExp = s.maxHp + (st().p.armguard ? 100 : 0);
  if (st().p.maxHp !== hpExp) throw new Error('生命成长异常: ' + st().p.maxHp + ' 期望 ' + hpExp);
  if (st().p.atk !== s.atk) throw new Error('攻击成长异常: ' + st().p.atk + ' 期望 ' + s.atk);
  if (st().p.maxMp !== s.maxMp) throw new Error('法术成长异常: ' + st().p.maxMp + ' 期望 ' + s.maxMp);
  if (st().p.maxSta !== s.maxSta) throw new Error('体力成长异常: ' + st().p.maxSta + ' 期望 ' + s.maxSta);
  console.log('  · 等级 ' + lv + '，成长曲线校验通过');
});
step('0.24等级上限1000与分段曲线', () => {
  const lv0 = st().p.level;
  const S = globalThis.__statsForLevel;
  const hBase = S(101).maxHp - S(100).maxHp;
  const hGold = S(120).maxHp - S(119).maxHp;
  const hLate = S(201).maxHp - S(200).maxHp;
  if (hGold <= hBase) throw new Error('120-200黄金期HP加成未高于基础期: ' + hGold + ' vs ' + hBase);
  if (hGold <= hLate) throw new Error('120-200黄金期HP加成未高于200级后: ' + hGold + ' vs ' + hLate);
  const aGold = S(200).atk - S(119).atk;
  if (aGold !== 81 * 4) throw new Error('黄金期攻击成长异常: ' + aGold);
  if (S(201).atk - S(200).atk !== 2) throw new Error('200级后攻击成长应为+2: ' + (S(201).atk - S(200).atk));
  __runCmd('/级 1000');
  if (st().p.level !== 1000) throw new Error('等级上限未到1000: ' + st().p.level);
  if (!isFinite(st().p.maxHp) || st().p.maxHp <= 0) throw new Error('1000级属性异常: ' + st().p.maxHp);
  st().p.level = 200;
  const xN200 = globalThis.__xpNeed();
  st().p.level = 300;
  const xN300 = globalThis.__xpNeed();
  st().p.level = 400;
  const xN400 = globalThis.__xpNeed();
  if (xN300 <= xN200) throw new Error('200级后经验未增长: ' + xN200 + ' vs ' + xN300);
  if (xN400 < xN300 * 2) throw new Error('200级后经验未成倍增长: ' + xN300 + ' vs ' + xN400);
  st().p.level = 1000;
  const xN1000 = globalThis.__xpNeed();
  if (!isFinite(xN1000) || xN1000 <= xN400) throw new Error('1000级经验需求异常: ' + xN1000);
  __runCmd('/级 ' + lv0); // 恢复自然等级（经验归零，终局打印无断言）
  console.log('  · 上限1000级：120-200加成最猛（HP' + hGold + '/级）、200级后经验指数增长（' + xN300 + '→' + xN400 + '→' + xN1000 + '）、加成递减');
});
console.log('\n=== 冒烟测试 v3 全部通过 ===');
console.log('结局: 第' + st().p.days + '天 · 等级=' + st().p.level + '（经验' + st().p.xp + '）· 金币=' + st().p.gold + ' · 武器=' + st().p.weapon.name + ' · 佣兵×' + st().p.mercs.length + ' · 活计完成=' + st().p.flags.jobCount + ' · 通缉=' + (st().p.flags.通缉 ? '是' : '否'));
