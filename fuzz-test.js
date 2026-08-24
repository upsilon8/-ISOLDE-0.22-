// 模糊测试 v1：随机点击按钮 + 随机开发者指令，找崩溃/死循环
// 用法: node fuzz-test.js [seed] [步数]
const fs = require('fs');
const html = fs.readFileSync('D:/DSS/prototype/isolde-prototype.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('FAIL: script block not found'); process.exit(1); }
const js = m[1];
try { new Function(js); } catch (e) { console.error('FAIL: syntax error ->', e.message); process.exit(1); }

const store = { 'isolde_settings': JSON.stringify({ font: 'm', tw: false }) }; // 测试关闭打字机
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
eval(js + '\n;globalThis.__getState=()=>state;globalThis.__runCmd=runCmd;');
const st = () => globalThis.__getState();
function btns() { return actEl.children.filter(c => c.tag === 'button' && !c.disabled).map(c => c._text); }
function has(t) { return btns().includes(t); }

// 简单可复现随机
let seed = parseInt(process.argv[2] || '7', 10);
const stepsCap = parseInt(process.argv[3] || '600', 10);
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

const devCmds = ['/钱 100', '/heal', '/god', '/god', '/级 3', '/item 绷带 2', '/item 铁料 5', '/item 干粮 2', '/天 5', '/清人', '/kill', '/龙', '/克', '/坦', '/通缉'];
const trace = [];
let errors = 0;

function act(label) {
  const b = actEl.children.find(c => c.tag === 'button' && c._text === label && !c.disabled);
  if (!b) throw new Error('按钮不存在: [' + label + ']  现有: ' + JSON.stringify(btns()));
  trace.push('点击 ' + label);
  if (trace.length > 25) trace.shift();
  b._f();
}
// 战斗自动打：优先弱点，低血格挡/逃跑，高血只攻击（避免纯格挡空转）
function autofight(maxRounds = 50) {
  let g = 0;
  while (has('攻击·侧面 (×1.3)') && g++ < maxRounds) {
    if (st().p.hp < 15 && has('逃跑')) act('逃跑');
    else if (has('刺腹部（弱点）')) act('刺腹部（弱点）');
    else if (has('刺腹部 (×2.0)')) act('刺腹部 (×2.0)');
    else if (st().p.hp < 30 && has('格挡 (减伤50%)')) act('格挡 (减伤50%)');
    else act(pick(['攻击·正面 (×0.8)', '攻击·侧面 (×1.3)']));
  }
  if (g >= maxRounds && has('攻击·侧面 (×1.3)')) {
    // 无逃跑按钮的强敌（老龙/赤河龙）低等级打不死：用开发者 /kill 脱出
    globalThis.__runCmd('/kill');
    if (has('攻击·侧面 (×1.3)')) throw new Error('战斗疑似死循环（/kill 也无法脱出）');
  }
}
// 噩梦死亡恢复
function recover() {
  if (has('起身')) { act('起身'); }
  else if (has('回最近城镇')) act('回最近城镇');
}

function step() {
  const list = btns();
  if (!list.length) return;
  const r = rnd();
  if (has('攻击·侧面 (×1.3)')) { autofight(); return; }
  if (has('起身')) { recover(); return; }
  if (r < 0.12) { // 随机开发者指令
    const c = pick(devCmds);
    trace.push('指令 ' + c);
    if (trace.length > 25) trace.shift();
    globalThis.__runCmd(c);
    return;
  }
  act(pick(list));
}

console.log('模糊测试：seed=' + (process.argv[2] || 7) + ' 步数=' + stepsCap);
try {
  act('新的开始');
  for (let i = 0; i < stepsCap; i++) {
    try { step(); }
    catch (e) {
      errors++;
      console.error('\n[第' + (i + 1) + '步] 崩溃: ' + e.message);
      console.error('最近操作:');
      for (const t of trace) console.error('  ' + t);
      console.error('当前按钮: ' + JSON.stringify(btns()));
      if (errors > 5) { console.error('错误过多，中止'); process.exit(1); }
    }
    // 卡死在战斗中？强制脱出
    if (has('起身')) { recover(); }
  }
} catch (e) {
  console.error('启动失败: ' + e.message);
  process.exit(1);
}
console.log('\n=== 模糊测试完成 ===  步数=' + stepsCap + ' 崩溃=' + errors + '  seed=' + (process.argv[2] || 7));
const stObj = st();
if (!stObj) {
  console.log('终态: 标题界面（已清档或重置） 按钮: ' + JSON.stringify(btns()));
} else {
  const s = stObj.p;
  console.log('终态: 第' + s.days + '天 · 等级' + s.level + ' · 金币' + s.gold + ' · 场景按钮: ' + JSON.stringify(btns()));
}
if (errors) process.exit(1);
