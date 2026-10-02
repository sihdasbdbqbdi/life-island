import test from "node:test";
import assert from "node:assert/strict";
import * as E from "./engine.js";
import { CARDS } from "./cards.js";
function game(n = 3) {
  const s = E.fresh();
  for (let i = 0; i < n; i++) E.addPlayer(s, `玩家${i + 1}`);
  E.startRound(
    s,
    Object.fromEntries(s.players.map((p) => [p.id, 9])),
    "极速收集",
  );
  s.order = s.players.map((p) => p.id);
  s.queue = [...s.order];
  return s;
}
function card(s, id, who = s.players[0]) {
  s.pending = [{ id: crypto.randomUUID(), playerId: who.id, cardId: id }];
}
test("18格顺序保持原图，80张卡牌唯一", () => {
  assert.equal(E.BOARD.length, 18);
  assert.equal(CARDS.length, 80);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 80);
  assert.equal(E.BOARD.filter((x) => x === "sao").length, 4);
});
test("经过起点获得200加落点；恰好起点只获得一次200", () => {
  let s = game(),
    p = s.players[0];
  p.pos = 17;
  E.roll(s, 2);
  assert.equal(p.pos, 1);
  assert.equal(p.cash, 210);
  assert.equal(p.points, 6);
  s = game();
  p = s.players[0];
  p.pos = 17;
  E.roll(s, 1);
  assert.equal(p.cash, 200);
  assert.equal(p.pos, 0);
});
test("同一玩家用完全部次数，才切换下一位", () => {
 const s=game(),first=s.players[0].id;
 E.roll(s,1);E.next(s);assert.equal(E.current(s).id,first);assert.equal(s.players[0].points,6);
 E.roll(s,1);E.next(s);assert.equal(E.current(s).id,first);
 E.roll(s,1);E.next(s);assert.equal(E.current(s).id,s.players[1].id);assert.equal(s.players[0].points,0);
});
test("仅余分结转，不能提前结束；完成后保存排名", () => {
 const s=game();s.players.forEach(p=>p.points=4);assert.throws(()=>E.finishRound(s),/还有可用/);
 for(let i=0;i<3;i++){E.roll(s,1);E.next(s);}
 assert.equal(s.phase,"between");assert.equal(s.snapshots.length,1);assert(s.players.every(p=>p.points===1));
 E.startRound(s,{[s.players[0].id]:2},"第二场");assert.equal(s.players[0].points,3);assert.equal(s.round,2);
});
test("不足3分不掷骰，保存轮末记录", () => {
  const s = E.fresh();
  E.addPlayer(s, "甲");
  E.addPlayer(s, "乙");
  E.startRound(s, { [s.players[0].id]: 2 }, "热身");
  assert.equal(s.phase, "between");
  assert.equal(s.players[0].points, 2);
  assert.equal(s.snapshots[0].round, 1);
});
test("落在Sao保留待结算；不能提前下一位；存档恢复", () => {
  const s = game();
  s.deck = [79];
  E.roll(s, 4);
  assert.equal(s.pending[0].cardId, 79);
  assert.throws(() => E.next(s));
  const restored = E.validateSave(JSON.parse(JSON.stringify(s)));
  E.resolve(restored);
  assert.equal(restored.players[0].cash, 200);
  E.next(restored);
  assert.equal(restored.queue[0], s.players[0].id);
});
test("连抽100元卡会新增待处理卡", () => {
  const s = game();
  s.deck = [79];
  card(s, 2);
  E.resolve(s);
  assert.equal(s.players[0].cash, 100);
  assert.equal(s.pending[0].cardId, 79);
  E.resolve(s);
  assert.equal(s.players[0].cash, 300);
});
test("负向回起点不给经过奖励；禁止奖励后退不触发落点", () => {
  const s = game(),
    p = s.players[0];
  p.pos = 6;
  card(s, 5);
  E.resolve(s);
  assert.equal(p.pos, 0);
  assert.equal(p.cash, 0);
  assert.equal(s.pending.length, 0);
  p.pos = 2;
  card(s, 68);
  E.resolve(s);
  assert.equal(p.pos, 0);
  assert.equal(p.cash, 0);
});
test("当场贫富转账守恒；并列自动选人", () => {
  const s = game();
  s.players[0].cash = 100;
  s.players[1].cash = 0;
  s.players[2].cash = 30;
  card(s, 8);
  E.resolve(s);
  assert.equal(s.players[0].cash, 50);
  assert.equal(s.players[1].cash, 50);
  assert.equal(
    s.players.reduce((a, p) => a + p.cash, 0),
    130,
  );
});
test("失去一次行动扣除3分且不移动", () => {
  const s = game();
  card(s, 3);
  E.resolve(s);
  E.roll(s, 6);
  assert.equal(s.players[0].points, 6);
  assert.equal(s.players[0].pos, 0);
  assert.equal(s.result.skipped, true);
  assert.equal(s.players[0].effects.length, 0);
});
test("一次性收入加倍与损失加倍独立触发", () => {
  const s = game(),
    p = s.players[0];
  card(s, 69);
  E.resolve(s);
  E.credit(s, p, 10, "奖励");
  assert.equal(p.cash, 20);
  E.credit(s, p, -10, "处罚");
  assert.equal(p.cash, 0);
  E.credit(s, p, 10, "奖励");
  assert.equal(p.cash, 10);
  assert.equal(p.effects.length, 0);
});
test("AI收入减半在下一轮过期", () => {
  const s = game();
  card(s, 4);
  E.resolve(s);
  assert.equal(s.players[0].effects.length, 1);
  s.players.forEach(p=>p.points=0);
  E.finishRound(s);
  assert.equal(s.players[0].effects.length, 0);
});
test("本轮已得收入扣回，之后仍能正常获得收入", () => {
  const s = game(),
    p = s.players[0];
  E.credit(s, p, 100, "奖励");
  card(s, 27);
  E.resolve(s);
  assert.equal(p.cash, 0);
  E.credit(s, p, 50, "奖励");
  assert.equal(p.cash, 50);
  assert(!p.effects.some(e=>e.key==='voidIncome'));
  s.players.forEach(p=>p.points=0);
  E.finishRound(s);
  assert.equal(p.effects.length, 0);
});
test("主持人裁定、提醒和取消卡可恢复", () => {
  const s = game();
  card(s, 64);
  E.resolve(s, {
    deltas: { [s.players[0].id]: -20 },
    override:true,
    note: "小明代扣",
    remind: true,
  });
  assert.equal(s.players[0].cash, -20);
  assert.equal(s.players[0].effects[0].key, "manual");
  card(s, 17);
  E.resolve(s);
  card(s, 79);
  E.cancelCard(s, s.players[0].id);
  assert.equal(s.players[0].cash, -20);
  assert.equal(s.pending.length, 0);
});
test("任意卡可以明确理由特殊裁定，不自动执行原效果", () => {
  const s = game();
  card(s, 79);
  E.resolve(s, { override: true, note: "现场裁定不发奖", remind: true });
  assert.equal(s.players[0].cash, 0);
  assert.equal(s.pending.length, 0);
  assert.equal(s.players[0].effects[0].key, "manual");
});
test("逐张校验80张卡执行分支与存档有效性", () => {
  for (const c of CARDS) {
    const s = game();
    s.players.forEach((p, i) => (p.cash = 100 * (i + 1)));
    card(s, c.id);
    E.resolve(s, {
      target: s.players[1].id,
      target2: s.players[2].id,
      choice: "yes",
      number: 1,
      deltas: {},
      note: "现场完成",
      remind: true,
    });
    assert.doesNotThrow(() => E.validateSave(s), c.title);
    assert(
      s.players.every((p) => Number.isFinite(p.cash)),
      c.title,
    );
  }
});
test("拒绝损坏存档：未知玩家、重复牌、非法金额", () => {
  const s = game();
  let bad = E.clone(s);
  bad.players[0].cash = "999";
  assert.throws(() => E.validateSave(bad));
  bad = E.clone(s);
  bad.queue.push("bad");
  assert.throws(() => E.validateSave(bad));
  bad = E.clone(s);
  bad.deck = [0, 0];
  assert.throws(() => E.validateSave(bad));
});
test("分数与玩家输入校验", () => {
  const s = E.fresh();
  E.addPlayer(s, "甲");
  assert.throws(() => E.addPlayer(s, "甲"));
  assert.throws(() => E.addPlayer(s, ""));
  E.addPlayer(s, "乙");
  assert.throws(() => E.startRound(s, { [s.players[0].id]: -1 }, "错误"));
  assert.throws(() =>
    E.adjust(s, s.players[0].id, { cash: 0, points: -1, pos: 0 }),
  );
});
test("转赠一次机会后本轮暂停，剩余积分保留",()=>{const s=game(),p=s.players[0],t=s.players[1];card(s,28);E.resolve(s,{target:t.id});assert.equal(p.points,6);assert.equal(t.points,12);assert(s.held.includes(p.id));assert.equal(E.current(s).id,t.id);});
test("多个玩家转账不受外部收入倍率影响", () => {
  const s = game(),
    p = s.players[0],
    t = s.players[1];
  card(s, 69, t);
  E.resolve(s);
  card(s, 62);
  E.resolve(s, { target: t.id });
  assert.equal(p.cash, -50);
  assert.equal(t.cash, 50);
  assert(t.effects.some((e) => e.key === "doubleNext"));
});
test("下一次限制步数仅生效一次", () => {
  const s = game();
  card(s, 25);
  E.resolve(s);
  E.roll(s, 6);
  assert.equal(s.players[0].pos, 1);
  assert.equal(s.result.die, 6);
  assert.equal(s.result.steps, 1);
  assert.equal(s.players[0].effects.length, 0);
});

test("十二面骰支持12点，跨起点正常；13点非法",()=>{const s=game(),p=s.players[0];p.pos=17;E.roll(s,12);assert.equal(p.pos,11);assert.equal(p.cash,300);assert.equal(s.result.die,12);assert.deepEqual(s.animationPaths,[{playerId:p.id,from:17,steps:12}]);assert.throws(()=>E.roll(game(),13),/1～12/);});
test("旧存档迁移：保留当前玩家和资金，恢复曾保留的可用次数",()=>{const s=game();delete s.turnMode;s.queue=[s.players[1].id];s.held=[s.players[0].id];s.players[2].color=s.players[1].color;const saved=E.validateSave(s);assert.equal(saved.queue[0],s.players[1].id);assert.equal(saved.queue.length,3);assert.equal(saved.held.length,0);assert.equal(new Set(saved.players.map(p=>p.color)).size,3);assert.equal(saved.players[0].points,9);});
test("20位玩家的颜色不会重复，包括移除再添加",()=>{const s=E.fresh();for(let i=0;i<20;i++)E.addPlayer(s,`岛民${i}`);assert.equal(new Set(s.players.map(p=>p.color)).size,20);s.players.splice(3,1);E.addPlayer(s,"新岛民");assert.equal(new Set(s.players.map(p=>p.color)).size,20);});
test("动态每次掷骰只显示一条摘要，详细记录仍保留",async()=>{const {activityEntries}=await import('./presentation.js');const s=game();E.roll(s,3);const entries=activityEntries(s.log);assert.match(entries[0].text,/玩家1 · 3 步 · \+30\$/);assert.equal(entries.filter(l=>l.text.includes('消耗')).length,0);assert(s.log.some(l=>l.detail&&l.text.includes('消耗')));});
test("12个五边形骰面，每个点数都能正面朝上",async()=>{const {D12_FACES,faceOrientation,rotate}=await import('./d12.js');assert.equal(D12_FACES.length,12);for(const f of D12_FACES){assert.equal(f.vertices.length,5);assert(Math.abs(rotate(faceOrientation(f.value),f.normal)[2]-1)<1e-8);}});
test('逐人录入：零分玩家也等待录入，同一人不重复加分',()=>{
 const s=E.fresh();E.addPlayer(s,'甲');E.addPlayer(s,'乙');s.players[0].points=2;E.startRound(s);s.order=s.players.map(p=>p.id);s.queue=[...s.order];
 assert.equal(s.queue.length,2);assert.throws(()=>E.roll(s,1));assert.throws(()=>E.next(s));
 E.enterScore(s,4);assert.equal(E.current(s).points,6);assert.throws(()=>E.enterScore(s,4));
 E.roll(s,1);E.next(s);assert.equal(E.current(s).name,'甲');E.roll(s,1);E.next(s);assert.equal(E.current(s).name,'乙');
 assert.equal(E.needsScore(s),true);E.enterScore(s,0);E.next(s);assert.equal(s.phase,'between');assert.equal(s.snapshots[0].players.find(p=>p.name==='甲').pos,2);
 E.startRound(s);assert.equal(s.players[0].pos,2);assert.equal(E.validateSave(s).scoreEntered.length,0);
});
test('重来恢复轮初钱包位置牌堆状态，移除本轮结果且不嵌套备份',()=>{
 const s=E.fresh();E.addPlayer(s,'甲');E.addPlayer(s,'乙');s.players[0].pos=17;s.players[0].cash=80;s.players[0].points=2;s.deck=[79];
 E.startRound(s);s.queue=s.players.map(p=>p.id);s.order=[...s.queue];E.enterScore(s,1);E.roll(s,2);E.next(s);E.enterScore(s,0);E.next(s);
 assert.equal(s.phase,'between');assert.equal(s.snapshots.length,1);E.restartRound(s);
 assert.equal(s.round,1);assert.equal(s.snapshots.length,0);assert.equal(s.players[0].pos,17);assert.equal(s.players[0].cash,80);assert.equal(s.players[0].points,2);assert.deepEqual(s.deck,[79]);assert.equal(s.scoreEntered.length,0);assert.equal(s.roundCheckpoint.roundCheckpoint,undefined);assert.doesNotThrow(()=>E.validateSave(s));
});
test('待录入和轮初备份可刷新恢复；拒绝损坏录入状态',()=>{
 const s=E.fresh();E.addPlayer(s,'甲');E.addPlayer(s,'乙');E.startRound(s);const restored=E.validateSave(JSON.parse(JSON.stringify(s)));assert.equal(E.needsScore(restored),true);E.enterScore(restored,11);assert.equal(E.needsScore(E.validateSave(restored)),false);restored.scoreEntered.push('unknown');assert.throws(()=>E.validateSave(restored));
});
test('暂停立即换人，积分结转；未录分的被困者仍能录分',()=>{
 const s=game();card(s,12);E.resolve(s);assert.equal(E.current(s).id,s.players[1].id);assert.equal(s.players[0].points,9);s.players.slice(1).forEach(p=>p.points=0);E.finishRound(s);assert.equal(s.phase,'between');E.startRound(s,{});assert.equal(s.players[0].points,9);assert(!s.held.length);
 const d=E.fresh();E.addPlayer(d,'甲');E.addPlayer(d,'乙');E.startRound(d);E.enterScore(d,3);card(d,38,E.current(d));E.resolve(d);assert.equal(d.phase,'playing');assert(E.needsScore(d));E.enterScore(d,8);assert.equal(d.phase,'between');assert.equal(d.players.reduce((n,p)=>n+p.points,0),11);
});
test('绑定复制目标一次行动的过起点、卡牌收支，不复制状态',()=>{
 const s=game();card(s,16);E.resolve(s);s.queue=[s.players[1].id];s.players[1].pos=17;s.deck=[79];E.roll(s,5);assert.equal(s.players[0].cash,200);E.resolve(s);assert.equal(s.players[0].cash,400);E.credit(s,s.players[1],-50,'扣款');assert.equal(s.players[0].cash,350);E.next(s);E.credit(s,s.players[1],10,'之后');assert.equal(s.players[0].cash,350);
});
test('互相跟随不形成无限循环，资助只跟随指定对象',()=>{
 const s=game();card(s,70);E.resolve(s,{target:s.players[1].id});card(s,70,s.players[1]);E.resolve(s,{target:s.players[0].id});E.roll(s,1);assert.equal(s.players[0].cash,10);assert.equal(s.players[1].cash,10);assert.equal(s.players[2].cash,0);
});
test('皇帝代扣转账，收款方正常收款，只代扣一次',()=>{
 const s=game();card(s,64);E.resolve(s,{target:s.players[1].id});card(s,62);E.resolve(s,{target:s.players[2].id});assert.deepEqual(s.players.map(p=>p.cash),[0,-50,50]);E.credit(s,s.players[0],-20,'再次');assert.equal(s.players[0].cash,-20);
});
test('轮末净收支交换含扣款且可恢复，最终排名在结算后保存',()=>{
 const s=game();E.credit(s,s.players[0],100,'收入');E.credit(s,s.players[0],-20,'损失');E.credit(s,s.players[1],200,'收入');card(s,20);E.resolve(s,{target:s.players[1].id});s.players.forEach(p=>p.points=0);E.finishRound(s);assert(s.settling);assert.equal(s.snapshots.length,0);const r=E.validateSave(s);E.settleRound(r,{});assert.deepEqual(r.players.map(p=>p.cash),[200,80,0]);assert.equal(r.snapshots.length,1);assert.throws(()=>E.settleRound(r,{}));
});
test('买卡给系统30，下一位其他玩家卡片转移，不能买自己的卡',()=>{
 const s=game();card(s,48);E.resolve(s,{choice:'yes'});s.deck=[79,79];E.draw(s,s.players[0]);assert.equal(s.pending[0].playerId,s.players[0].id);assert(s.players[0].effects.some(e=>e.key==='buyCard'));s.pending=[];E.draw(s,s.players[1]);assert.equal(s.pending[0].playerId,s.players[0].id);assert(!s.players[0].effects.some(e=>e.key==='buyCard'));E.resolve(s);assert.equal(s.players[0].cash,170);
});
test('最近按环形距离，误开麦只有目标移动且触发卡片',()=>{
 const s=game();s.players[0].pos=0;s.players[1].pos=17;s.players[2].pos=5;assert.equal(E.nearest(s,s.players[0])[0].id,s.players[1].id);s.players[1].pos=2;s.players[2].pos=7;s.deck=[79];card(s,74);E.resolve(s);assert.equal(s.players[0].pos,0);assert.equal(s.players[1].pos,4);assert.equal(s.pending[0].playerId,s.players[1].id);
});
test('AI只在下一次行动减半，PPT两次行动所有收入加20',()=>{
 const s=game();card(s,4);E.resolve(s);E.credit(s,s.players[0],100,'当前行动');assert.equal(s.players[0].cash,100);s.players[0].pos=17;E.roll(s,2);assert.equal(s.players[0].cash,205);E.next(s);E.roll(s,1);assert.equal(s.players[0].cash,255);
 const d=game();card(d,67);E.resolve(d);d.players[0].pos=17;E.roll(d,2);assert.equal(d.players[0].cash,250);E.next(d);E.roll(d,1);assert.equal(d.players[0].cash,320);E.next(d);E.roll(d,1);assert.equal(d.players[0].cash,350);
});
test('现场挑战轮末集中结算，校验空值且不提前修改金额',()=>{
 const s=game();for(const id of [11,51,63]){card(s,id);E.resolve(s,{target:s.players[1].id});}s.players.forEach(p=>p.points=0);E.finishRound(s);assert.throws(()=>E.settleRound(s,{}));assert.equal(s.players[0].cash,0);const answers=Object.fromEntries(s.roundJobs.map(j=>[j.id,j.kind==='stand'?'no':j.kind==='laugh'?s.players[2].id:3]));E.settleRound(s,answers);assert.deepEqual(s.players.map(p=>p.cash),[10,-60,-50]);assert.equal(s.phase,'between');
});
test('摆拍选择两种结果符合新规则',()=>{for(const [choice,expected]of [['yes',[30,30,0]],['no',[60,-20,0]]]){const s=game();card(s,54);E.resolve(s,{choice,target:s.players[1].id});assert.deepEqual(s.players.map(p=>p.cash),expected);}});

test('经过起点按移动路径和步数即时发奖，最终落点不重复',()=>{
 const s=game(),p=s.players[0];p.pos=17;s.animationPaths=[];s.moneyEvents=[];
 E.move(s,p,3);
 assert.equal(p.cash,250);
 assert.deepEqual(s.moneyEvents.map(e=>[e.amount,e.atPath,e.atStep]),[[200,0,1],[50,undefined,undefined]]);
});
test('跨多圈每次经过起点各自有到账时刻',()=>{
 const s=game(),p=s.players[0];p.pos=17;s.animationPaths=[];s.moneyEvents=[];
 E.move(s,p,20);
 assert.equal(p.cash,410);
 assert.deepEqual(s.moneyEvents.filter(e=>e.atStep).map(e=>e.atStep),[1,19]);
});

test('6、12、24面骰各自限制点数，旧存档默认12面',()=>{
 for(const sides of [6,12,24]){const s=game();s.rules.diceSides=sides;assert.throws(()=>E.roll(E.clone(s),sides+1));E.roll(s,sides);assert.equal(s.result.die,sides);assert.equal(E.validateSave(s).rules.diceSides,sides);}
 const old=game();delete old.rules.diceSides;assert.equal(E.validateSave(old).rules.diceSides,12);
 const bad=game();bad.rules.diceSides=20;assert.throws(()=>E.validateSave(bad));
});
test('三种立体骰子面数与朝向对应正确',async()=>{
 const {diceFaces,faceOrientation,rotate}=await import('./d12.js');for(const sides of [6,12,24]){const faces=diceFaces(sides);assert.equal(faces.length,sides);for(const f of faces){const n=rotate(faceOrientation(f.value,sides),f.normal);assert(Math.abs(n[2]-1)<.00001);}}
});
test('旧存档的后续收入作废状态移除，收入可以继续获得',()=>{
 const s=game(),p=s.players[0];p.effects.push({id:crypto.randomUUID(),key:'voidIncome',label:'本轮后续外部收入作废',createdAction:0,expiresRound:s.round});
 const restored=E.validateSave(s),r=restored.players[0];assert(!r.effects.some(e=>e.key==='voidIncome'));E.credit(restored,r,70,'奖励');assert.equal(r.cash,70);
});

test('骰子整段旋转持续减速，末段不再补转且准确停在结果面',async()=>{
 const {createRollOrientation}=await import('./dice-motion.js');const {faceOrientation,dot}=await import('./d12.js');
 for(const power of [0,.5,1])for(const sides of [6,12,24])for(let value=1;value<=sides;value++){
  const from=faceOrientation(value%sides+1,sides),target=faceOrientation(value,sides),at=createRollOrientation(from,target,power);
  assert(Math.abs(dot(at(0),from))>1-1e-10);assert(Math.abs(dot(at(1),target))>1-1e-10);
  let last=Infinity,previous=at(0);
  for(let frame=1;frame<=120;frame++){const q=at(frame/120);const angular=2*Math.acos(Math.min(1,Math.abs(dot(previous,q))));assert(angular<=last+1e-7,`面数${sides}点数${value}末段发生加速`);last=angular;previous=q;}
 }
});
test('骰子惯性路线在边界连续反射，多次碰撞后不会被拉回中心',async()=>{
 const {reflectedPosition,rollEase,CHARGE_MS}=await import('./dice-motion.js');assert.equal(CHARGE_MS,1500);
 assert.equal(reflectedPosition(0,120,100).position,80);assert.equal(reflectedPosition(0,-120,100).position,-80);
 assert.equal(reflectedPosition(0,540,100).position,60);
 for(let i=0;i<=1000;i++){const p=reflectedPosition(20,3650*rollEase(i/1000),180);assert(p.position>=-180&&p.position<=180);}
 const left=reflectedPosition(0,99.999,100).position,right=reflectedPosition(0,100.001,100).position;assert(Math.abs(left-right)<.00001);
 assert.equal(rollEase(0),0);assert.equal(rollEase(1),1);
});
test('拖动朝向正确，原地及轻微手抖保持随机弹射',async()=>{
 const {aimAngle}=await import('./dice-motion.js');assert.equal(aimAngle(0,0),null);assert.equal(aimAngle(5,-5),null);
 assert.equal(Math.abs(aimAngle(100,0)),Math.PI);assert.equal(aimAngle(0,-100),Math.PI/2);assert.equal(Math.abs(aimAngle(-100,0)),0);assert.equal(aimAngle(80,80),-3*Math.PI/4);
});

test('头像随存档保存，拒绝远程地址与超大内容',()=>{
 const s=game();s.players[0].avatar='data:image/jpeg;base64,/9j/AA==';
 assert.equal(E.validateSave(JSON.parse(JSON.stringify(s))).players[0].avatar,s.players[0].avatar);
 s.players[0].avatar='https://example.com/photo.jpg';assert.throws(()=>E.validateSave(s),/头像/);
 s.players[0].avatar='data:image/jpeg;base64,'+'A'.repeat(16000);assert.throws(()=>E.validateSave(s),/头像/);
 delete s.players[0].avatar;assert.doesNotThrow(()=>E.validateSave(s));
});
test('头像裁剪覆盖圆形，拖动与缩小均不露底',async()=>{
 const {cropGeometry}=await import('./avatar.js');
 for(const [w,h] of [[1200,800],[800,1200],[300,300]])for(const zoom of [1,2,4]){
  const g=cropGeometry(w,h,zoom,{x:9999,y:-9999});assert(g.width>=240&&g.height>=240);
  assert(g.width/2-Math.abs(g.x)>=120);assert(g.height/2-Math.abs(g.y)>=120);
 }
});

test('重新游戏清除角色和全部本场数据，序列化恢复仍为空',()=>{
 const s=game();s.players[0].cash=900;s.players[0].pos=8;s.players[0].effects.push({key:'test'});s.rules.diceSides=24;s.awardsPending=true;s.extraOldField=true;
 E.restartGame(s);const empty=E.fresh();empty.createdAt=s.createdAt;assert.deepEqual(s,empty);const restored=E.validateSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.players.length,0);assert.equal(restored.round,0);assert.equal(restored.phase,"lobby");assert.deepEqual(restored.snapshots,[]);
});
test('轮末颁奖状态可恢复，继续下一轮和整局结束互斥',()=>{
 const s=game();s.players.forEach(p=>p.points=0);E.finishRound(s);assert.equal(s.awardsPending,true);assert.equal(E.validateSave(s).awardsPending,true);
 const next=structuredClone(s);E.startRound(next);assert.equal(next.phase,'playing');assert.equal(next.awardsPending,false);assert.equal(next.round,2);
 E.finishGame(s);assert.equal(s.phase,'finished');assert.equal(s.awardsPending,false);assert.equal(s.snapshots.length,1);assert.equal(E.validateSave(s).phase,'finished');assert.throws(()=>E.startRound(s),/本局已结束/);assert.throws(()=>E.restartRound(s),/本局已结束/);E.restartGame(s);assert.equal(s.phase,'lobby');
});
test('未完成烧烧卡和轮末任务不会提前颁奖或结束整局',()=>{
 const s=game();assert.throws(()=>E.finishGame(s),/结算/);s.players.forEach(p=>p.points=0);s.pending.push({id:'pending'});assert.throws(()=>E.finishRound(s),/烧烧卡/);assert(!s.awardsPending);s.pending=[];s.roundJobs.push({kind:'talk',id:'job',playerId:s.players[0].id,targetId:s.players[1].id});E.finishRound(s);assert.equal(s.settling,true);assert(!s.awardsPending);assert.throws(()=>E.finishGame(s),/结算/);
});
