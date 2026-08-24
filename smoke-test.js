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
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; }, get innerHTML() { return this._html || ''; },
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

eval(js + '\n;globalThis.__getState=()=>state;globalThis.__getCtx=()=>ctx;globalThis.__runCmd=runCmd;');

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
function step(label, fn) { try { fn(); console.log('OK: ' + label); } catch (e) { console.error('FAIL: ' + label + ' -> ' + e.message); process.exit(1); } }
function fightUntilOver(maxRounds = 80) {
  let guard = 0;
  while (has('攻击·侧面 (×1.3)')) {
    if (has('刺腹部（弱点）')) click('刺腹部（弱点）');
    else if (has('刺腹部 (×2.0)')) click('刺腹部 (×2.0)');
    else if (st().p.hp < 25 && has('格挡 (减伤50%)')) click('格挡 (减伤50%)');
    else click('攻击·侧面 (×1.3)');
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

/* ============ 流程 ============ */
step('标题→新的开始', () => click('新的开始'));
step('捡起木剑', () => click('捡起木剑'));
step('沿路北上', () => click('沿着河往北走'));
step('野狗首战', () => { click('拔剑'); fightUntilOver(); if (!st().p.inv.兽皮) throw new Error('未获得兽皮'); });
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
step('巨魔桥（连锁战×2）', () => { click('接：巨魔桥——桥洞住了巨魔（报酬10铜币+旧银币）');
  if (!has('石桥（巨魔桥）')) throw new Error('接单后应直达城外');
  click('石桥（巨魔桥）'); click('引出一只'); fightUntilOver();
  if (st().p.inv.巨魔牙 !== 2) throw new Error('巨魔牙=' + st().p.inv.巨魔牙);
  click('回告示板交差'); click('交差：巨魔桥（+10铜币+旧银币）');
  if (st().p.inv.旧银币 !== 1 || st().p.gold !== 19) throw new Error('巨魔桥结算异常'); });
step('偷蛋（含惊蛇战斗分支）', () => {
  click('接：偷蛋——沼泽巨蛇的蛋（报酬12铜币）');
  click('沼泽（偷蛋）');
  let guard = 0;
  while (st().p.inv.蛇蛋 < 1 && guard++ < 6) {
    click('慢慢摸过去（稳妥，七成）');
    if (has('攻击·侧面 (×1.3)')) fightUntilOver();
    if (st().p.inv.蛇蛋 < 1) {
      if (has('回城')) { click('回城'); click('告示板'); click('偷蛋：南边沼泽'); click('沼泽（偷蛋）'); }
      else if (has('告示板')) { click('告示板'); click('偷蛋：南边沼泽'); click('沼泽（偷蛋）'); }
    }
  }
  if (st().p.inv.蛇蛋 < 1) throw new Error('未拿到蛇蛋');
  if (!has('交差：偷蛋（+12铜币）')) { click('离开'); click('告示板'); }
  click('交差：偷蛋（+12铜币）');
  if (st().p.gold !== 31) throw new Error('金币=' + st().p.gold + '（预期31）'); });
step('护送·大路（+8）', () => { click('接：护送商队（大路8铜币/小路12铜币）');
  if (!has('护送进行中：商队在镇口')) throw new Error('接单后应直达城外');
  click('护送进行中：商队在镇口'); click('走大路');
  click('交差：护送（+8铜币）'); if (st().p.gold !== 39) throw new Error('金币=' + st().p.gold); });
step('护送·反水→被通缉', () => { click('接：护送商队（大路8铜币/小路12铜币）'); click('护送进行中：商队在镇口'); click('夜深了货就在那');
  if (!st().p.flags.通缉 || st().p.gold !== 59) throw new Error('反水结算异常');
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
step('BOSS委托：吞骨鳄（支线解锁+一次性）', () => {
  if (!rawBtns().some(t => t.includes('吞骨鳄'))) throw new Error('jobCount不足未解锁吞骨鳄');
  click('BOSS委托：吞骨鳄（渡口河湾·报酬15铜板）');
  if (!has('河湾（吞骨鳄）')) throw new Error('接单后应直达城外');
  click('河湾（吞骨鳄）'); click('靠近水边');
  let attempts = 0;
  while (true) {
    if (++attempts > 6) throw new Error('吞骨鳄重试过多');
    fightUntilOver(100);
    if (has('起身')) { console.log('  · 吞骨鳄把主角打回营地（噩梦）'); click('起身'); click('离开'); click('河湾（吞骨鳄）'); click('靠近水边'); continue; }
    break;
  }
  click('回告示板交差'); click('交差：吞骨鳄（+15铜板）');
  if (rawBtns().some(t => t.includes('吞骨鳄'))) throw new Error('吞骨鳄应一次性消失');
  if (!st().p.inv.黑鳄皮) throw new Error('未获得黑鳄皮'); });
step('猪王讨伐（含死亡重试）', () => { click('接：猪王讨伐（报酬15铜板+旧铁片·仅一次）');
  click('农田（猪王讨伐）'); click('走近');
  let attempts = 0;
  while (true) {
    if (++attempts > 6) throw new Error('猪王重试次数过多');
    fightUntilOver();
    if (has('起身')) { console.log('  · 触发死亡路径：噩梦后回营地（符合设计）'); click('起身'); click('离开'); click('农田（猪王讨伐）'); click('走近'); continue; }
    break;
  }
  click('回告示板交差'); click('交差：猪王讨伐（+15铜板+旧铁片）');
  if (!logHas('切片终点')) throw new Error('未到切片终点'); });
step('匿名委托（猪王后解锁，+30）', () => { click('继续闲逛'); click('告示板');
  click('匿名委托：出30铜币，别问是什么');
  click('扎营'); click('休息（恢复全部+存档）'); click('离开');
  if (has('攻击·侧面 (×1.3)')) fightUntilOver();
  click('废屋（匿名委托）'); click('进去');
  fightUntilOver(); if (!st().p.inv.魔化兽皮) throw new Error('未获得魔化兽皮');
  click('交差：匿名委托（+30铜币）'); });
step('阿什沃德新活计（赶鸦+掘墓人）', () => {
  if (st().p.flags.通缉) st().p.flags.通缉 = false; // 避免赏金猎人伏击干扰
  click('接：赶鸦——田里的食腐鸦（报酬6铜币）');
  if (!has('麦田（赶鸦）')) throw new Error('赶鸦未直达城外: ' + JSON.stringify(btns()));
  click('麦田（赶鸦）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续赶'); }
  click('回告示板'); click('交差：赶鸦（+6铜币）');
  if (!has('BOSS委托：掘墓人（乱葬岗·报酬18铜板+送葬骨灰）')) throw new Error('掘墓人委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：掘墓人（乱葬岗·报酬18铜板+送葬骨灰）');
  click('乱葬岗（掘墓人）');
  fightUntilOver();
  click('交差：掘墓人（+18铜板+送葬骨灰×2）');
  if (st().p.inv.送葬骨灰 < 2) throw new Error('送葬骨灰未到账');
  if (!has('接：教训疯乞丐（报酬8铜币）')) throw new Error('疯乞丐委托缺失: ' + JSON.stringify(btns()));
  // 连环委托：河滩失踪案（3段流程，支持团灭重试）
  if (!has('连环委托：河滩失踪案（报酬22铜板+旧银币）')) throw new Error('河滩连环委托缺失: ' + JSON.stringify(btns()));
  __runCmd('/heal');
  click('连环委托：河滩失踪案（报酬22铜板+旧银币）');
  let gR = 0;
  while (!has('交差：河滩失踪案（+22铜板+旧银币）') && gR++ < 8) {
    if (has('河滩（失踪案）')) click('河滩（失踪案）');
    if (has('查看水迹')) click('查看水迹');
    let fought = 0;
    while (has('攻击·侧面 (×1.3)') && fought < 6) { fightUntilOver(); fought++; if (has('起身')) break; }
    if (has('起身')) { click('起身'); click('离开'); }
  }
  if (!has('交差：河滩失踪案（+22铜板+旧银币）')) throw new Error('河滩连环未完成: ' + JSON.stringify(btns()));
  click('交差：河滩失踪案（+22铜板+旧银币）');
  if (st().p.inv.旧银币 < 1) throw new Error('旧银币未到账');
  // 高危委托：血盐商队（3连战）。测试中直接推高 jobCount 以解锁 /14
  st().p.flags.jobCount = 14;
  click('离开'); click('告示板');
  if (!has('高危委托：血盐商队（西边商路·报酬45铜板+血盐×4）')) throw new Error('血盐商队委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：血盐商队（西边商路·报酬45铜板+血盐×4）');
  runChain(3, () => { click('西边商路（血盐商队）'); click('截住商队'); }, '交差：血盐商队（+45铜板+血盐×4）');
  click('交差：血盐商队（+45铜板+血盐×4）');
  if (st().p.inv.血盐 < 4) throw new Error('血盐奖励未到账');
  if (!rawBtns().some(b => b.includes('/16'))) throw new Error('骑士巡逻队锁定行缺失');
  console.log('  · 赶鸦3群+掘墓人BOSS+河滩失踪案4连战+血盐商队3连战，骑士巡逻队(/16)在列');
});
step('野外游荡×12（随机遭遇）', () => {
  click('离开'); click('出城');
  if (has('攻击·侧面 (×1.3)')) fightWander();
  let enc = 0, guard = 0;
  while (enc < 12 && guard++ < 50) {
    if (has('在野外游荡')) click('在野外游荡');
    else if (has('继续游荡')) click('继续游荡');
    else if (has('继续走')) click('继续走'); // 大龙败局之后
    else if (has('回城')) { click('回城'); click('出城'); continue; }
    else throw new Error('无法游荡: ' + JSON.stringify(btns()));
    if (has('攻击·侧面 (×1.3)')) fightWander();
    if (has('起身')) { click('起身'); click('离开'); continue; } // 死回营地
    if (has('别管他')) click('别管他'); // 落魄骑士事件
    else if (has('继续赶路')) click('继续赶路'); // 采药人/旅行商人
    enc++;
  }
  if (enc < 12) throw new Error('游荡次数不足: ' + enc);
  if (has('继续走')) click('继续走'); // 大龙败局之后
  if (has('回城')) click('回城');
  console.log('  · 游荡12次完成，等级' + st().p.level + '，金币' + st().p.gold);
});
step('商店3天刷新', () => {
  const c0 = (st().p.shop.smith || { cycle: -1 }).cycle;
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
  if (has('攻击·侧面 (×1.3)')) {
    __runCmd('/kill');
    if (has('攻击·侧面 (×1.3)')) throw new Error('/kill未生效');
    console.log('  · /kill 战斗内秒杀生效');
  }
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
step('护甲四部位', () => {
  __runCmd('/钱 200');
  click('铁匠铺');
  click('买：皮背心（15铜币，胸·+3防）');
  click('买：皮革帽（8铜币，头·+1防）');
  if (st().p.def !== 4) throw new Error('防御=' + st().p.def);
  if (!st().p.gear.胸 || !st().p.gear.头) throw new Error('部位装备失败');
  click('离开'); click('出城'); click('扎营');
  __runCmd('/item 锁子甲胸甲 1');
  click('穿戴护甲'); click('锁子甲胸甲（胸·+6防）');
  if (st().p.def !== 7) throw new Error('换装后防御=' + st().p.def);
  if (st().p.gear.胸.name !== '锁子甲胸甲') throw new Error('换装失败');
  click('离开'); click('回城');
  console.log('  · 四部位护甲装备与换装退款正常（防' + st().p.def + '）');
});
step('新武器类型（军刀/战戟）', () => {
  __runCmd('/钱 100');
  click('铁匠铺');
  click('买：弯刀（22铜币，+9攻击，军刀）');
  if (st().p.weapon.type !== '军刀' || st().p.weapon.atk !== 9) throw new Error('弯刀异常: ' + JSON.stringify(st().p.weapon));
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
  // 东方武器：黄刀应带异纹词条
  click('异域商人');
  click('买：黄刀（50铜币，+8攻击，对硬直目标+10%）');
  if (!st().p.weapon.fx || !st().p.weapon.fx.includes('异纹')) throw new Error('黄刀应有异纹词条: ' + JSON.stringify(st().p.weapon.fx));
  click('离开');
  console.log('  · 弯刀购买+军刀定制+铁料留店+黄刀异纹');
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
  click('返回'); click('返回'); // → 铁匠铺
  __runCmd('/item 铁料 25');
  __runCmd('/钱 100');
  click('熔炼精钢（铁料×20+50铜币 → 精炼熔断钢铁×1）');
  if (st().p.inv.精炼熔断钢铁 !== 1) throw new Error('熔炼未产出精钢');
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
  if (st().p.weapon.atk !== 50) throw new Error('大马士革刀攻击异常: ' + st().p.weapon.atk);
  click('离开');
  console.log('  · 熔炼精钢×1+精钢锻造必史诗+大马士革刀7200铜币+50攻击');
});
step('连携（匕首→大剑佣兵）', () => {
  __runCmd('/清人');
  __runCmd('/钱 300');
  if (has('返回')) click('返回');
  if (has('返回')) click('返回');
  if (has('铁匠铺')) click('铁匠铺');
  click('买：生锈匕首（10铜币，+5攻击）');
  click('离开'); click('出城'); click('扎营');
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
  if (has('攻击·侧面 (×1.3)')) fightWander();
  if (has('起身')) { click('起身'); click('离开'); } // 噩梦恢复
  click('在野外游荡');
  let g2 = 0;
  while (!has('攻击·侧面 (×1.3)') && g2++ < 15) {
    if (has('继续游荡')) click('继续游荡');
    else if (has('继续赶路')) click('继续赶路');
    else if (has('别管他')) click('别管他');
    else if (has('继续走')) click('继续走');
    else if (has('起身')) { click('起身'); click('离开'); }
    else if (has('回城')) { click('回城'); click('出城'); click('在野外游荡'); }
    else throw new Error('游荡异常: ' + JSON.stringify(btns()));
  }
  if (!has('攻击·侧面 (×1.3)')) throw new Error('15次没遇敌');
  if (!btns().some(b => b.startsWith('连携'))) throw new Error('匕首+大剑应有连携: ' + JSON.stringify(btns()));
  click(btns().find(b => b.startsWith('连携')));
  if (!logHas('连携！')) throw new Error('连携未生效');
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
  if (!has('BOSS委托：蛙后（南边大泽·报酬25铜板+蛙油膏×2）')) throw new Error('蛙后委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：蛙后（南边大泽·报酬25铜板+蛙油膏×2）');
  click('南边大泽（蛙后）');
  click('下水');
  fightUntilOver(); // 护主沼蛙
  fightUntilOver(); // 蛙后
  click('交差：蛙后（+25铜板+蛙油膏×2）');
  if (st().p.inv.蛙油膏 < 2) throw new Error('蛙油膏奖励未到账');
  // 高危委托：沼潮祭坛（3连战）
  if (!has('高危委托：沼潮祭坛（深沼·报酬48铜板+水渍石×3）')) throw new Error('沼潮祭坛委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：沼潮祭坛（深沼·报酬48铜板+水渍石×3）');
  runChain(3, () => { click('深沼（沼潮祭坛）'); click('趟进去'); }, '交差：沼潮祭坛（+48铜板+水渍石×3）');
  click('交差：沼潮祭坛（+48铜板+水渍石×3）');
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
  click('灰衣骑士小队：北边路口');
  click('冲阵');
  for (let i = 0; i < 3; i++) fightUntilOver();
  if (!has('交差：灰衣骑士小队（+25铜币）')) throw new Error('小队未完成: ' + JSON.stringify(btns()));
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
  if (!has('BOSS委托：灰衣指挥官（报酬45铜板+灰衣队长徽记）')) throw new Error('灰衣指挥官委托缺失: ' + JSON.stringify(btns()));
  __runCmd('/heal');
  click('BOSS委托：灰衣指挥官（报酬45铜板+灰衣队长徽记）');
  let guardC = 0;
  while (!has('交差：灰衣指挥官（+45铜板+灰衣队长徽记）') && guardC++ < 8) {
    click('灰衣指挥官：北边路口');
    click('冲阵');
    for (let i = 0; i < 3; i++) {
      fightUntilOver();
      if (has('起身')) break; // 团灭回营地，整链重来
    }
    if (has('起身')) { click('起身'); click('离开'); }
  }
  if (!has('交差：灰衣指挥官（+45铜板+灰衣队长徽记）')) throw new Error('灰衣指挥官未完成');
  click('交差：灰衣指挥官（+45铜板+灰衣队长徽记）');
  // 高危委托：灰衣征税总队（3连战）
  if (!has('高危委托：灰衣征税总队（北边税卡·报酬60铜板+灰衣队长徽记×2）')) throw new Error('征税总队委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：灰衣征税总队（北边税卡·报酬60铜板+灰衣队长徽记×2）');
  runChain(3, () => { click('北边税卡（灰衣征税总队）'); click('闯卡'); }, '交差：灰衣征税总队（+60铜板+灰衣队长徽记×2）');
  click('交差：灰衣征税总队（+60铜板+灰衣队长徽记×2）');
  console.log('  · 虱潮三波/灰衣小队三连/流民×2/灭鼠×3/灰衣指挥官三连/征税总队三连 全部击破');
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
  if (!has('BOSS委托：野狼王（北边野林·报酬20铜板+兽皮×3）')) throw new Error('野狼王委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：野狼王（北边野林·报酬20铜板+兽皮×3）');
  click('野狼王：北边野林');
  fightUntilOver();
  click('交差：野狼王（+20铜板+兽皮×3）');
  console.log('  · 集市麦饼+巡防骑士入队+商路清障×3+野狼王BOSS');
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
  if (!has('高危委托：教堂大执事（圣坛·报酬55铜板+苦蜜蜡×3）')) throw new Error('教堂大执事委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：教堂大执事（圣坛·报酬55铜板+苦蜜蜡×3）');
  runChain(3, () => { click('教堂大执事：镇中心圣坛'); click('上前'); }, '交差：教堂大执事（+55铜板+苦蜜蜡×3）');
  click('交差：教堂大执事（+55铜板+苦蜜蜡×3）');
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
  if (st().p.weapon.type !== '骨刃' || st().p.weapon.atk !== 8) throw new Error('骨刀异常: ' + JSON.stringify(st().p.weapon));
  click('买：疫骨甲（25铜币，胸·+5防）');
  click('离开');
  click('告示板');
  click('接：赶牲口（灰肉牲口×3，报酬8铜币）');
  click('赶牲口：河边草场（还剩 3 头）');
  for (let i = 0; i < 3; i++) { fightUntilOver(); if (i < 2) click('继续赶'); }
  click('回告示板'); click('交差：赶牲口（+8铜币）');
  // 骨匠帮 3连战
  if (!has('BOSS委托：骨匠帮（北边骨场·报酬30铜板+疫骨×2）')) throw new Error('骨匠帮委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：骨匠帮（北边骨场·报酬30铜板+疫骨×2）');
  runChain(3, () => { click('骨匠帮：北边骨场'); click('闯骨场'); }, '交差：骨匠帮（+30铜板+疫骨×2）');
  click('交差：骨匠帮（+30铜板+疫骨×2）');
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
  // 驱赶海盗（2连）
  click('接：驱赶海盗（南码头·报酬18铜币+海鱼×2）');
  runChain(2, () => { click('海盗：南码头'); }, '交差：驱赶海盗（+18铜币+海鱼×2）');
  click('交差：驱赶海盗（+18铜币+海鱼×2）');
  // 盐鬼 BOSS
  if (!has('BOSS委托：盐鬼（盐田·报酬28铜板+水渍石×2）')) throw new Error('盐鬼委托缺失: ' + JSON.stringify(btns()));
  click('BOSS委托：盐鬼（盐田·报酬28铜板+水渍石×2）');
  click('盐鬼：盐田');
  fightUntilOver();
  click('交差：盐鬼（+28铜板+水渍石×2）');
  // 探索龙巢穴（三层地城）
  if (!has('地城委托：探索龙巢穴（海崖洞窟·报酬50铜板+龙鳞×2）')) throw new Error('龙巢穴委托缺失: ' + JSON.stringify(btns()));
  click('地城委托：探索龙巢穴（海崖洞窟·报酬50铜板+龙鳞×2）');
  __runCmd('/heal');
  let lairGuard = 0;
  while (!has('交差：探索龙巢穴（+50铜板+龙鳞×2）') && lairGuard++ < 8) {
    const lb = btns().find(b => b.startsWith('龙巢穴：海崖洞窟'));
    if (lb) click(lb);
    if (has('进洞')) { click('进洞'); fightUntilOver(); }
    let lf = 0;
    while (has('攻击·侧面 (×1.3)') && lf++ < 4) { fightUntilOver(); if (has('起身')) break; }
    if (has('上前')) { click('上前'); fightUntilOver(); }
    if (has('起身')) { click('起身'); click('离开'); }
  }
  if (!has('交差：探索龙巢穴（+50铜板+龙鳞×2）')) throw new Error('龙巢穴未完成: ' + JSON.stringify(btns()));
  click('交差：探索龙巢穴（+50铜板+龙鳞×2）');
  // 高危：灯塔怪光（4连，含巢穴之主）
  if (!has('高危委托：灯塔怪光（东角灯塔·报酬70铜板+精炼熔断钢铁）')) throw new Error('灯塔怪光委托缺失: ' + JSON.stringify(btns()));
  click('高危委托：灯塔怪光（东角灯塔·报酬70铜板+精炼熔断钢铁）');
  runChain(4, () => { click('灯塔怪光：东角灯塔'); click('推门进去'); }, '交差：灯塔怪光（+70铜板+精炼熔断钢铁）');
  click('交差：灯塔怪光（+70铜板+精炼熔断钢铁）');
  if (st().p.inv.精炼熔断钢铁 < 1) throw new Error('精钢奖励未到账');
  console.log('  · 烤鱼+出海捕鱼三网+海盗2连+盐鬼+龙巢穴三层+灯塔怪光4连');
});
step('龙巢无限下潜（肉鸽·50层臂甲）', () => {
  if (has('离开')) click('离开');
  click('告示板');
  const el = btns().find(b => b.startsWith('龙巢深处：无限下潜'));
  if (!el) throw new Error('无限下潜未解锁: ' + JSON.stringify(btns()));
  click(el);
  fightUntilOver(); // 第1层
  if (!btns().some(b => b.startsWith('继续下潜（第 2 层）'))) throw new Error('层间场景缺失: ' + JSON.stringify(btns()));
  click('返回地面');
  if (!btns().some(b => b.startsWith('龙巢深处：无限下潜'))) throw new Error('返回后入口缺失');
  // 直接跳到49层，验证第50层巨鲸之泉龙与裂纹的臂甲
  st().p.lairFloor = 49;
  click(btns().find(b => b.startsWith('龙巢深处：无限下潜')));
  __runCmd('/god');
  fightUntilOver(); // 第49层普通层
  click('继续下潜（第 50 层）');
  fightUntilOver(); fightUntilOver(); fightUntilOver(); // 2杂兵 + 巨鲸之泉龙
  __runCmd('/god');
  if (!st().p.armguard || st().p.armguard.name !== '裂纹的臂甲') throw new Error('50层臂甲未获得: ' + JSON.stringify(st().p.armguard));
  if (!st().p.flags.armguardGot) throw new Error('臂甲标志未置位');
  const hpExp = 110 + 10 * (st().p.level - 1) + 50;
  if (st().p.maxHp !== hpExp) throw new Error('臂甲生命上限未生效: ' + st().p.maxHp + ' vs ' + hpExp);
  if (!logHas('阿喀琉斯的左臂甲')) throw new Error('臂甲描述缺失');
  click('返回地面'); // 出肉鸽
  if (has('离开')) click('离开'); // 出告示板回镇
  console.log('  · 无限下潜往返+第50层巨鲸之泉龙+裂纹的臂甲（法伤/队友/生命）');
});
step('随从装备定制', () => {
  if (has('离开')) click('离开'); // 上一步可能结束在店内或镇里
  click('铁匠铺');
  __runCmd('/item 铁料 10');
  click('定制随从装备（骑士/伙伴）');
  if (!has('为安普卢斯打造')) throw new Error('安普卢斯不在定制名单');
  click('为安普卢斯打造');
  click('武器（铁料×2，+每回合伤害）');
  click('护甲（铁料×3，+1层挡刀，上限3）');
  if (!st().p.companion || !st().p.companion.w || !st().p.companion.a) throw new Error('随从装备未生效');
  console.log('  · 安普卢斯：每回合伤害+1、挡刀1层');
});
step('大龙遭遇（必败情节）', () => {
  if (has('离开')) click('离开');
  if (has('离开')) click('离开');
  __runCmd('/龙');
  if (!has('攻击·正面 (×0.8)')) throw new Error('大龙战未开始: ' + JSON.stringify(btns()));
  st().p.hp = 30; // 压低生命，确保在团队反杀前倒下（验证无回合限制下的败局路径）
  let guard = 0;
  while (has('攻击·正面 (×0.8)') && guard++ < 30) {
    click('攻击·正面 (×0.8)'); // 不格挡，正面硬接
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
step('赤河龙（40级·可击杀）', () => {
  __runCmd('/god');   // 测试用无敌，正面验证可击杀路径
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
step('终局校验', () => {
  if (!store['isolde_proto_v1']) throw new Error('存档丢失');
  if (st().p.days < 4) throw new Error('天数异常');
  const lv = st().p.level;
  if (lv < 2) throw new Error('等级过低: ' + lv);
  const hpExp = 110 + 10 * (lv - 1) + (st().p.armguard ? 50 : 0);
  if (st().p.maxHp !== hpExp) throw new Error('生命成长异常: ' + st().p.maxHp);
  if (st().p.atk !== 12 + 3 * (lv - 1)) throw new Error('攻击成长异常: ' + st().p.atk);
  if (st().p.maxMp !== 50 + 5 * (lv - 1)) throw new Error('法术成长异常: ' + st().p.maxMp);
  if (st().p.maxSta !== 100 + 5 * (lv - 1)) throw new Error('体力成长异常: ' + st().p.maxSta);
  console.log('  · 等级 ' + lv + '，成长曲线校验通过');
});
console.log('\n=== 冒烟测试 v3 全部通过 ===');
console.log('结局: 第' + st().p.days + '天 · 等级=' + st().p.level + '（经验' + st().p.xp + '）· 金币=' + st().p.gold + ' · 武器=' + st().p.weapon.name + ' · 佣兵×' + st().p.mercs.length + ' · 活计完成=' + st().p.flags.jobCount + ' · 通缉=' + (st().p.flags.通缉 ? '是' : '否'));
