// 验证打字机效果与存档码编解码往返
const fs = require('fs');
const html = fs.readFileSync('D:/DSS/prototype/isolde-prototype.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
const js = m[1];
const store = { 'isolde_settings': JSON.stringify({ font: 'm', tw: true }) }; // 开打字机
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
eval(js + '\n;globalThis.__getState=()=>state;globalThis.__runCmd=runCmd;globalThis.__export=exportSave;');
const st = () => globalThis.__getState();
function btns() { return actEl.children.filter(c => c.tag === 'button' && !c.disabled).map(c => c._text); }
function click(label) {
  const b = actEl.children.find(c => c.tag === 'button' && c._text === label && !c.disabled);
  if (!b) throw new Error('按钮不存在: [' + label + ']  现有: ' + JSON.stringify(btns()));
  b._f();
}
function allText() { return logEl.children.map(c => c._text).join('\n'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  click('新的开始');
  // 场景描述应逐字打印：立即看应是"部分文字"，2 秒后应是完整文字
  const immediately = allText();
  const full = '你在河边醒来\n你是个北方人——你的领地被夺走了，人也被放逐到了南方\n身上什么都没有，河水在耳边响\n一只乌鸦停在旁边，啄了啄你的肩膀，叫了一声，飞走了\n\n身边躺着一把木剑，剑柄上刻着一个"W"\n\n夺走你领地的人，就盘踞在北方——想回去，得先在南境站住脚';
  if (immediately.includes(full)) throw new Error('打字机未生效：文本一次性出现');
  let waited = 0;
  while (!allText().includes(full) && waited < 12000) { await sleep(300); waited += 300; }
  if (!allText().includes(full)) throw new Error('打字机未完成打印');
  console.log('OK: 打字机逐字打印并在短时间内完成');

  // 进镇 → 导出存档 → 解码往返
  click('捡起木剑');
  await sleep(500);
  click('沿着河往北走');
  click('拔剑');
  globalThis.__runCmd('/kill');
  await sleep(300);
  click('继续走');
  await sleep(300);
  st().p.gold = 777;
  click('⚙ 系统');
  await sleep(300);
  click('打字机效果：正常（点击文字可跳过）'); // → 快速
  await sleep(100);
  click('打字机效果：快速（点击文字可跳过）'); // → 关闭，清空队列
  await sleep(200);
  globalThis.__export();
  await sleep(200);
  const codeLine = logEl.children.map(c => c._text).find(t => t.startsWith('ISOLDE'));
  if (!codeLine) throw new Error('未找到存档码');
  const json = decodeURIComponent(escape(Buffer.from(codeLine.replace(/^ISOLDE/, ''), 'base64').toString('binary')));
  const s = JSON.parse(json);
  if (!s.p || s.p.gold !== 777 || s.sv !== 2) throw new Error('存档码解码不一致: ' + JSON.stringify(s.p && s.p.gold));
  console.log('OK: 存档码编解码往返一致（gold=777, sv=' + s.sv + '）');
  process.exit(0);
})().catch(e => { console.error('FAIL: ' + e.message); process.exit(1); });
