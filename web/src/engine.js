import { CARDS, CARD_BY_ID } from "./cards.js";
export const BOARD = [
  200,
  10,
  50,
  30,
  "sao",
  60,
  20,
  30,
  "sao",
  40,
  0,
  100,
  "sao",
  70,
  10,
  30,
  "sao",
  40,
];
export const POSITIONS = [
  [5, 4],
  [4, 4],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 4],
  [0, 3],
  [0, 2],
  [0, 1],
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [5, 0],
  [5, 1],
  [5, 2],
  [5, 3],
];
export const COLORS = [
  "teal",
  "orange",
  "purple",
  "pink",
  "blue",
  "green",
  "yellow",
  "red",
  "lime",
  "peach",
  "brown", "navy", "rose", "olive", "cyan", "violet", "ochre", "slate", "forest", "magenta",
];
export const DICE_SIDES = 12;
export const fresh = () => ({
  version: 1,
  turnMode: "complete-player",
  phase: "lobby",
  players: [],
  round: 0,
  roundName: "",
  order: [],
  queue: [],
  held: [],
  pending: [],
  deck: [],
  log: [],
  snapshots: [],
  action: 0,
  roundJobs: [],
  settling: false,
  acted: false,
  result: null,
  rules: { cost: 3, initialMoney: 0, passBonus: 200, diceSides:12 },
  createdAt: new Date().toISOString(),
});
export const clone = (s) => structuredClone(s);
export const money = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function integer(min, max) {
  const span = max - min + 1;
  const buf = new Uint32Array(1);
  const limit = Math.floor(4294967296 / span) * span;
  do {
    globalThis.crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return min + (buf[0] % span);
}
export function shuffle(list) {
  let a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = integer(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function record(s, text, detail = false) {
  s.log.unshift({
    id: crypto.randomUUID(),
    round: s.round,
    text,
    detail,
    time: new Date().toISOString(),
  });
  s.log = s.log.slice(0, 500);
}
export const player = (s, id) => s.players.find((p) => p.id === id);
export const current = (s) => player(s, s.queue[0]);
export const ranked = (s) =>
  [...s.players].sort(
    (a, b) => b.cash - a.cash || s.players.indexOf(a) - s.players.indexOf(b),
  );
export function addPlayer(s, name) {
  name = name.trim();
  if (!name || name.length > 16) throw Error("名字请填写1～16个字");
  if (s.players.some((p) => p.name === name))
    throw Error("这个名字已经在岛上了");
  if (s.players.length >= 20) throw Error("最多支持20位玩家");
  if (s.phase === "finished") throw Error("本局已结束，请重新开局");
  if (s.phase === "playing") throw Error("请在轮次结束后添加玩家");
  const p = {
    id: crypto.randomUUID(),
    name,
    color: COLORS.find(color => !s.players.some(p => p.color === color)),
    cash: s.rules.initialMoney,
    points: 0,
    pos: 0,
    effects: [],
    lastIncome: 0,
    roundIncome: 0,
    roundNet: 0,
    roundStart: s.rules.initialMoney,
  };
  s.players.push(p);
  record(s, `${name} 加入`);
  return s;
}
function effect(s, p, key, label, opts = {}) {
  p.effects.push({
    id: crypto.randomUUID(),
    key,
    label,
    createdAction: s.action,
    ...opts,
  });
}
function removeEffect(p, e) {
  p.effects = p.effects.filter((x) => x.id !== e.id);
}
export function credit(s, p, amount, reason, { raw = false, derived = false, routed = false, sourceId, tile } = {}) {
  amount = money(amount);
  if (!raw && amount > 0) {
    const skip = p.effects.find((e) => e.key === "skipIncome");
    if (skip) {
      amount = 0;
      removeEffect(p, skip);
    }
    if (amount > 0) {
      for (const e of [...p.effects]) {
        if (e.key === "halfRound" || (e.key === "halfTurns" && e.activeAction === s.action)) amount /= 2;
        if (e.key === "doubleNext") {
          amount *= 2;
          removeEffect(p, e);
        }
        if (e.key === "halfNext") {
          amount /= 2;
          removeEffect(p, e);
        }
        if (e.key === "bonusTurns" && e.activeAction === s.action) amount += e.value;
      }
    }
  }
  if (!raw && amount < 0) {
    const e = p.effects.find((e) => e.key === "doubleLoss");
    if (e) {
      amount *= 2;
      removeEffect(p, e);
    }
  }
  if(raw && !derived && amount>0)for(const e of p.effects){if(e.activeAction===s.action){if(e.key==='halfTurns')amount/=2;if(e.key==='bonusTurns')amount+=e.value;}}
  amount = money(amount);
  if(amount < 0 && !routed && !derived) {
    const emperor=p.effects.find(e=>e.key==='emperor');
    if(emperor){removeEffect(p,emperor);const payer=player(s,emperor.targetId);if(payer)return credit(s,payer,amount,`${p.name} 的代扣 · ${reason}`,{raw:true,routed:true,sourceId,tile});}
  }
  p.cash = money(p.cash + amount);
  if(!s.settling)p.roundNet=money((p.roundNet||0)+amount);
  if(amount)(s.moneyEvents??=[]).push({playerId:p.id,amount,sourceId,tile:tile??p.pos});
  if(!derived && amount) for(const owner of s.players) for(const e of [...owner.effects]) {
    if(e.key==='mirror' && e.targetId===p.id && e.activeAction===s.action) credit(s,owner,amount,`跟随 ${p.name}`,{raw:true,derived:true,sourceId:p.id});
  }
  if (amount > 0) {
    p.lastIncome = amount;
    p.roundIncome = money(p.roundIncome + amount);
  }
  record(s, `${p.name} ${amount >= 0 ? "+" : ""}${amount} 元 · ${reason}`, true);
  return amount;
}
function transfer(s, from, to, n, reason) {
  if (from.id === to.id) {
    record(s, `${from.name} · ${reason}：目标为自己，不发生转账`);
    return;
  }
  credit(s, from, -n, reason, { raw: true });
  credit(s, to, n, reason, { raw: true, sourceId:from.id });
}
function pickWealth(s, which = "rich", excludeId) {
  let ps = s.players.filter((p) => p.id !== excludeId);
  if (!ps.length) return null;
  const n =
    which === "poor"
      ? Math.min(...ps.map((p) => p.cash))
      : Math.max(...ps.map((p) => p.cash));
  return shuffle(ps.filter((p) => p.cash === n))[0];
}
export function draw(s, p) {
  if (!s.deck.length) s.deck = shuffle(CARDS.map((c) => c.id));
  const buyer=s.players.flatMap(owner=>owner.effects.filter(e=>e.key==='buyCard'&&owner.id!==p.id).map(e=>({owner,e}))).sort((a,b)=>a.e.createdAction-b.e.createdAction)[0];
  if(buyer){record(s,`${buyer.owner.name} 买走 ${p.name} 的烧烧卡`);removeEffect(buyer.owner,buyer.e);p=buyer.owner;}
  const cardId = s.deck.pop();
  s.pending.push({ id: crypto.randomUUID(), playerId: p.id, cardId });
  record(s, `${p.name} 抽到「${CARD_BY_ID[cardId].title}」`, true);
}
export function move(
  s,
  p,
  steps,
  { reward = true, factor = 1, trigger = true } = {},
) {
  const previous = p.pos;
  (s.animationPaths ??= []).push({playerId:p.id, from:previous, steps});
  const next =
    (((previous + steps) % BOARD.length) + BOARD.length) % BOARD.length;
  if (reward && steps > 0) {
    const passes = Math.floor((previous + steps) / BOARD.length);
    for(let lap=0;lap<passes;lap++) {
      const begin=s.moneyEvents?.length||0;
      credit(s,p,s.rules.passBonus*factor,"经过起点",{tile:0});
      for(const event of (s.moneyEvents||[]).slice(begin))Object.assign(event,{atPath:s.animationPaths.length-1,atStep:BOARD.length-previous+lap*BOARD.length});
    }
  }
  p.pos = next;
  record(
    s,
    `${p.name} ${steps >= 0 ? "前进" : "后退"} ${Math.abs(steps)} 格，到达 ${next === 0 ? "起点" : `第${next}格`}`,
    true,
  );
  if (!trigger) return;
  if (BOARD[next] === "sao") draw(s, p);
  else if (reward && next !== 0) credit(s, p, BOARD[next] * factor, "落点奖励", {tile:next});
}
export const needsScore = (s, id = current(s)?.id) => s.scoreMode === "on-turn" && !s.scoreEntered.includes(id);
export function enterScore(s, value) {
  const p = current(s);
  if(s.phase !== "playing" || !p || !needsScore(s) || s.pending.length) throw Error("当前无需录入积分");
  if(!Number.isInteger(value) || value < 0 || value > 999) throw Error("积分必须是0～999的整数");
  p.points += value; s.scoreEntered.push(p.id);
  record(s, `${p.name} · +${value} 分`);
  if(s.held.includes(p.id)) next(s);
  return s;
}
export function restartGame(s) {
 const players=clone(s.players),rules=clone(s.rules);
 Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,fresh(),{rules});
 for(const old of players){addPlayer(s,old.name);Object.assign(s.players.at(-1),{id:old.id,color:old.color,avatar:old.avatar||"",cash:0,roundStart:0});}
 s.log=[];return s;
}
export function finishGame(s){
 if(s.phase!=="between"||s.pending.length||s.settling)throw Error("请先完成本轮结算");
 s.phase="finished";s.awardsPending=false;return s;
}
export function restartRound(s) {
  if(s.phase==="finished")throw Error("本局已结束，请重新开局");
  if(!s.roundCheckpoint) throw Error("此轮没有开始前的备份，可从下一轮使用重来");
  const saved = clone(s.roundCheckpoint), name = s.roundName;
  Object.keys(s).forEach(k => delete s[k]); Object.assign(s, saved);
  return startRound(s, undefined, name);
}
export function startRound(s, grants, name = "") {
  if (s.phase === "finished") throw Error("本局已结束，请重新开局");
  if (s.phase === "playing") throw Error("请先完成当前轮");
  s.awardsPending=false;
  if (s.players.length < 2) throw Error("至少需要两位玩家");
  const staged = grants === undefined;
  grants ??= {};
  const checkpoint = clone(s); delete checkpoint.roundCheckpoint; delete checkpoint.animationPaths; delete checkpoint.moneyEvents;
  for (const p of s.players) {
    const n = Number(grants[p.id] ?? 0);
    if (!Number.isInteger(n) || n < 0 || n > 999)
      throw Error("积分必须是0～999的整数");
  }
  s.roundCheckpoint = checkpoint;
  s.scoreMode = staged ? "on-turn" : "batch";
  s.scoreEntered = staged ? [] : s.players.map(p=>p.id);
  s.roundJobs=[];s.settling=false;
  s.round++;
  s.roundName = name.trim() || `第 ${s.round} 轮`;
  s.phase = "playing";
  s.held = [];
  s.acted = false;
  s.result = null;
  for (const p of s.players) {
    p.points += Number(grants[p.id] ?? 0);
    p.roundIncome = 0;
    p.roundNet = 0;
    p.roundStart = p.cash;
    p.effects = p.effects.filter(
      (e) => e.expiresRound === undefined || e.expiresRound >= s.round,
    );
  }
  s.order = shuffle(s.players.map((p) => p.id));
  s.queue = s.order.filter((id) => staged || player(s, id).points >= s.rules.cost);
  record(
    s,
    `第 ${s.round} 轮开始`,
  );
  if (!s.queue.length) finishRound(s);
  return s;
}
export function roll(s, forced) {
  if (s.phase !== "playing" || s.acted || s.pending.length || needsScore(s) || s.settling || s.held.includes(current(s)?.id))
    throw Error("当前无法掷骰");
  const p = current(s);
  if (!p || p.points < s.rules.cost) throw Error("积分不足");
  s.animationPaths = [];s.moneyEvents=[];
  s.action++;
  s.acted = true;
  const gift = p.effects.find((e) => e.key === "giveRoll");
  if (gift) {
    const t = player(s, gift.targetId);
    if (!t) throw Error("转赠对象不存在");
    p.points -= s.rules.cost;
    t.points += s.rules.cost;
    removeEffect(p, gift);
    if (!s.queue.includes(t.id)) s.queue.push(t.id);
    s.result = {
      playerId: p.id,
      die: 0,
      steps: 0,
      skipped: true,
      description: `本次机会已转给${t.name}`,
    };
    record(
      s,
      `${p.name} 将1次掷骰机会（${s.rules.cost}积分）转给${t.name}，本次不移动`,
    );
    return s;
  }
  const skip = p.effects.find((e) => e.key === "skip");
  if (skip) {
    removeEffect(p, skip);
    s.result = { playerId: p.id, die: 0, steps: 0, skipped: true };
    p.points-=s.rules.cost;
    record(s, `${p.name} 失去1次掷骰机会 · −${s.rules.cost} 分`);
    return s;
  }
  for(const owner of s.players)for(const e of owner.effects){
    if((e.key==='mirror'&&e.targetId===p.id)|| (owner.id===p.id&&['halfTurns','bonusTurns'].includes(e.key))) e.activeAction=s.action;
  }
  const die = forced ?? integer(1, s.rules.diceSides||12);
  if (!Number.isInteger(die) || die < 1 || die > (s.rules.diceSides||12))
    throw Error(`骰子点数应为1～${s.rules.diceSides||12}`);
  p.points -= s.rules.cost;
  const one = p.effects.find((e) => e.key === "rollOne");
  const steps = one ? 1 : die;
  if (one) removeEffect(p, one);
  s.result = { playerId: p.id, die, steps, beforeCash: p.cash };
  record(s, `${p.name} 消耗 ${s.rules.cost} 积分，掷出 ${die} 点`, true);
  move(s, p, steps);
  const delta=money(p.cash-s.result.beforeCash);
  record(s, `${p.name} · ${steps} 步${delta ? ` · ${delta > 0 ? "+" : ""}${delta}` : ""}${s.pending.length ? " · 抽卡" : ""}`);
  return s;
}
function tick(s,p){
  for(const owner of s.players)owner.effects=owner.effects.filter(e=>{
    if(e.activeAction!==s.action)return true;
    if(e.key==='mirror'&&e.targetId===p.id)return false;
    if(owner.id===p.id&&['halfTurns','bonusTurns'].includes(e.key)){e.turns--;delete e.activeAction;return e.turns>0;}
    return true;
  });
}
export function nearest(s,p,count=1){
 return shuffle(s.players.filter(t=>t.id!==p.id)).sort((a,b)=>distance(a)-distance(b)).slice(0,count);
 function distance(t){const d=Math.abs(t.pos-p.pos);return Math.min(d,BOARD.length-d);}
}
function pause(s,p){if(!s.held.includes(p.id))s.held.push(p.id);record(s,`${p.name} 本轮暂停 · 积分保留`);}
function job(s,p,kind,targetId){(s.roundJobs??=[]).push({id:crypto.randomUUID(),playerId:p.id,kind,targetId});}
export function settleRound(s,answers={}){
 if(!s.settling)throw Error('尚未到轮末结算');
 const net=Object.fromEntries(s.players.map(p=>[p.id,p.roundNet||0]));
 for(const j of s.roundJobs){const answer=answers[j.id];
  if(j.kind==='stand'&&!['yes','no'].includes(answer))throw Error('请确认站立挑战');
  if(j.kind==='laugh'&&answer!=='none'&&(!player(s,answer)||answer===j.playerId))throw Error('请选择笑出声的人或无人');
  if(j.kind==='talk'&&(!Number.isInteger(Number(answer))||answer===''||answer===undefined||Number(answer)<0||Number(answer)>999))throw Error('请填写说话次数');
 }
 s.moneyEvents=[];
 for(const j of s.roundJobs){const p=player(s,j.playerId),t=player(s,j.targetId),answer=answers[j.id];
  if(j.kind==='swap'){const delta=money(net[t.id]-net[p.id]);credit(s,p,delta,'本轮收支交换',{raw:true,derived:true,routed:true,sourceId:t.id});credit(s,t,-delta,'本轮收支交换',{raw:true,derived:true,routed:true,sourceId:p.id});}
  if(j.kind==='stand'&&answer==='no')credit(s,p,-100,'站立挑战失败');
  if(j.kind==='laugh'&&answer!=='none')transfer(s,player(s,answer),p,50,'笑出声');
  if(j.kind==='talk')transfer(s,t,p,20*Number(answer),'说话结算');
 }
 s.roundJobs=[];s.settling=false;return finishRound(s);
}
export function next(s) {
  const p = current(s);
  if (!p || needsScore(s) || s.pending.length || (!s.acted && p.points >= s.rules.cost && !s.held.includes(p.id))) throw Error("请先完成当前行动及烧烧卡");
  if (s.acted) tick(s, p);
  // 同一位玩家继续，直到只剩不足一次掷骰的余分。
  s.queue = s.queue.filter(id => needsScore(s,id) || (player(s, id).points >= s.rules.cost && !s.held.includes(id)));
  for (const id of s.order) if (!s.held.includes(id) && player(s,id).points >= s.rules.cost && !s.queue.includes(id)) s.queue.push(id);
  s.acted = false;
  s.result = null;
  if (!s.queue.length) finishRound(s);
  return s;
}
export function finishRound(s) {
  if (s.players.some(p => needsScore(s,p.id))) throw Error("还有玩家未录入本轮积分");
  if (s.players.some(p => p.points >= s.rules.cost && !s.held.includes(p.id))) throw Error("本轮还有可用的掷骰次数");
  if (s.pending.length) throw Error("还有烧烧卡没有结算");
  if(s.roundJobs?.length){s.settling=true;return s;}
  s.snapshots.push({
    round: s.round,
    name: s.roundName,
    players: ranked(s).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      cash: p.cash,
      points: p.points,
      pos: p.pos,
      change: money(p.cash - p.roundStart),
    })),
  });
  s.phase = "between";
  s.awardsPending=true;
  s.queue = [];
  s.acted = false;
  s.result = null;
  for (const p of s.players)
    p.effects = p.effects.filter(
      (e) => e.expiresRound === undefined || e.expiresRound > s.round,
    );
  record(s, `第 ${s.round} 轮结束，资金排名已保存`);
  return s;
}
export function resolve(s, form = {}) {
  s.animationPaths = [];s.moneyEvents=[];
  const balances = Object.fromEntries(s.players.map(p => [p.id,p.cash]));
  const logIds = new Set(s.log.map(l=>l.id));
  const pending = s.pending[0];
  if (!pending) throw Error("没有待结算卡片");
  const original = CARD_BY_ID[pending.cardId];
  const c = form.override
      ? { ...original, kind: "manual", extra: original.text }
      : original,
    p = player(s, pending.playerId);
  if (form.override && !form.note?.trim()) throw Error("请填写特殊裁定原因");
  const target = player(s, form.target),
    target2 = player(s, form.target2);
  const needs = [
    "transfer",
    "targetMoney",
    "bail",
    "giveRoll",
    "richSplit",
    "duel", "mirror", "swap", "emperor", "talk", "photo",
  ];
  if (
    needs.includes(c.kind) &&
    (!target || target.id === p.id) &&
    !(c.kind === "bail" && form.choice === "no")
  )
    throw Error("请选择另一位玩家");
  if (
    ["party", "payTwo", "twoDraw"].includes(c.kind) &&
    (!target ||
      !target2 ||
      target.id === target2.id ||
      target.id === p.id ||
      target2.id === p.id)
  )
    throw Error("请选择两位不同的其他玩家");
  const n = Number(form.number ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > 10000)
    throw Error("请填写合理的非负数字");
  if (c.kind === "manual")
    for (const amount of Object.values(form.deltas ?? {})) {
      if (
        !Number.isFinite(Number(amount)) ||
        Math.abs(Number(amount)) > 1000000
      )
        throw Error("调整金额不正确");
    }
  s.pending.shift();
  const pay = (v) => credit(s, p, v, c.title);
  const skip = () => effect(s, p, "skip", "失去一次掷骰机会");
  const doub = () => effect(s, p, "doubleNext", "下次收入翻倍");
  switch (c.kind) {
    case "money":
      pay(c.value);
      break;
    case "moneySkip":
      pay(c.value);
      if(c.id===0)skip();else pause(s,p);
      break;
    case "skip":
      if(c.id===3)skip();else pause(s,p);
      break;
    case "moneyDraw":
      pay(c.value);
      draw(s, p);
      break;
    case "giftDraw": {
      const t = pickWealth(s);
      draw(s, t);
      break;
    }
    case "halfTurns":
      effect(s, p, "halfTurns", "本轮下次行动收入减半", {
        turns: 1,
        expiresRound: s.round,
      });
      break;
    case "move":
      move(s, p, c.value, {
        reward: c.extra !== "none",
        factor: c.extra === "half" ? 0.5 : 1,
        trigger: c.extra !== "none",
      });
      break;
    case "duel":
      transfer(
        s,
        form.choice === "lose" ? p : target,
        form.choice === "lose" ? target : p,
        c.value,
        c.title,
      );
      break;
    case "poorest": {
      const t = pickWealth(s, "poor");
      transfer(s, p, t, c.value, c.title);
      break;
    }
    case "previousIncome": {
      const i = s.order.indexOf(p.id);
      const t = player(s, s.order[(i - 1 + s.order.length) % s.order.length]);
      pay(t?.lastIncome || 0);
      break;
    }
    case "lastIncome":
      pay(p.lastIncome);
      break;
    case "moneySkipIncome":
      pay(c.value);
      effect(s, p, "skipIncome", "跳过下一次收入");
      break;
    case "payDouble":
      pay(c.value);
      effect(s, p, "doubleNext", "本轮下次收入翻倍", { expiresRound: s.round });
      break;
    case "shield":
      effect(s, p, "shield", "可取消1张烧烧卡");
      break;
    case "yesMoney":
      if (form.choice === "yes") pay(c.value);
      break;
    case "richSplit": {
      const t = pickWealth(s);
      transfer(s, t, p, 50, c.title);
      transfer(s, t, target, 50, c.title);
      break;
    }
    case "party":
      pay(50);
      credit(s, target, 20, c.title);
      credit(s, target2, 20, c.title);
      break;
    case "rollOne":
      effect(s, p, "rollOne", "下次只能前进1格");
      break;
    case "twoDraw":
      draw(s, target);
      draw(s, target2);
      break;
    case "voidIncome": {
      const total = p.roundIncome;
      credit(s, p, -total, c.title, { raw: true });
      p.roundIncome = 0;
      p.effects=p.effects.filter(e=>e.key!=="voidIncome");
      break;
    }
    case "giveRoll":
      if(p.points>=s.rules.cost){p.points-=s.rules.cost;target.points+=s.rules.cost;if(!s.queue.includes(target.id)&&!s.held.includes(target.id))s.queue.push(target.id);}else effect(s,p,'giveRoll',`下次机会转给${target.name}`,{targetId:target.id});
      pause(s,p);break;
    case "payMove":
      pay(c.value);
      move(s, p, c.extra);
      break;
    case "payTwo":
      transfer(s, p, target, c.value, c.title);
      transfer(s, p, target2, c.value, c.title);
      break;
    case "halfRound":
      effect(s, p, "halfRound", "本轮收入减半", { expiresRound: s.round });
      break;
    case "percent":
      pay(Math.max(0, p.cash) * c.value);
      break;
    case "topFive": {
      const tops = shuffle(s.players)
        .sort((a, b) => b.cash - a.cash)
        .slice(0, 5);
      for (const t of tops) transfer(s, t, p, c.value, c.title);
      break;
    }
    case "bail":
      if (form.choice === "no") pay(-100);
      else credit(s, target, -20, `保释${p.name}`, { raw: true });
      break;
    case "secondRich": {
      const list = shuffle(s.players).sort((a, b) => b.cash - a.cash);
      transfer(s, list[1] || p, p, c.value, c.title);
      break;
    }
    case "countMoney":
      if (!Number.isInteger(n) || n > s.players.length - 1)
        throw Error("人数应为其他玩家人数范围内的整数");
      pay(n * c.value);
      break;
    case "optionalMove":
      if (form.choice === "yes") {
        pay(-20);
        move(s, p, 5);
      }
      break;
    case "nothing":
      record(s, `${p.name} · 虚惊一场，无事发生`);
      break;
    case "clockMoney":
      pay(new Date().getMinutes() < 30 ? 100 : -100);
      break;
    case "minuteMoney": {
      const minute = new Date().getMinutes();
      pay(Math.max(1, Math.ceil(minute / 10)) * 10);
      break;
    }
    case "targetMoney":
      credit(s, target, c.value, c.title);
      break;
    case "floor":
      if (!Number.isInteger(n)) throw Error("楼层应为整数");
      pay(Math.min(n, 8) * c.value);
      break;
    case "transfer":
      transfer(s, p, target, c.value, c.title);
      break;
    case "payOrSkip":
      if (form.choice === "pay") pay(-50);
      else pause(s,p);
      break;
    case "bonusTurns":
      effect(s, p, "bonusTurns", "接下来2次行动收入＋20", {
        turns: 2,
        value: 20,
      });
      break;
    case "home":
      p.pos = 0;
      record(s, `${p.name} 回到起点，不领取奖励`);
      break;
    case "doubleBoth":
      doub();
      effect(s, p, "doubleLoss", "下次损失翻倍");
      break;
    case "halfNext":
      effect(s, p, "halfNext", "下次收入减半");
      break;
    case "rpsCount":
      if (!Number.isInteger(n)) throw Error("次数应为整数");
      pay(20 - n * 20);
      break;
    case "parity": {
      const die = integer(1, s.rules.diceSides||12);
      record(s, `${p.name} 卡牌额外掷骰：${die}点（不移动）`);
      pay(die % 2 === 0 ? 10 : -10);
      break;
    }
    case "moneyDouble":
      pay(c.value);
      doub();
      break;
    case "mirrorNext": {
      const t=player(s,s.order[(s.order.indexOf(p.id)+1)%s.order.length]);
      effect(s,p,'mirror',`跟随 ${t.name} 下一次行动的全部收支`,{targetId:t.id});break;
    }
    case "mirror": effect(s,p,'mirror',`跟随 ${target.name} 下一次行动的全部收支`,{targetId:target.id});break;
    case "swap": job(s,p,'swap',target.id);break;
    case "emperor": effect(s,p,'emperor',`下次扣款由 ${target.name} 承担`,{targetId:target.id});break;
    case "trapped": pay(-50);pause(s,p);pause(s,shuffle(s.players.filter(t=>t.id!==p.id))[0]);break;
    case "buy": if(form.choice==='yes'){pay(-30);effect(s,p,'buyCard','买走下一位其他玩家抽到的烧烧卡');}break;
    case "photo": if(form.choice==='yes'){pay(30);credit(s,target,30,c.title);}else{pay(60);credit(s,target,-20,c.title);}break;
    case "nearGift": pay(-20);credit(s,nearest(s,p)[0],50,c.title);break;
    case "nearLoss": pay(-50);for(const t of nearest(s,p,2))credit(s,t,-20,c.title);break;
    case "nearMove": move(s,nearest(s,p)[0],2);break;
    case "stand": job(s,p,'stand');break;
    case "laugh": job(s,p,'laugh');break;
    case "talk": job(s,p,'talk',target.id);break;
    case "manual":
      for (const t of s.players) {
        const v = Number(form.deltas?.[t.id] || 0);
        if (v) credit(s, t, v, `${c.title} · 主持人裁定`, { raw: true });
      }
      if (form.remind)
        effect(s, p, "manual", `${c.title}：${form.note?.trim() || c.extra}`);
      record(
        s,
        `${p.name} ·「${c.title}」由主持人确认${form.note ? `：${form.note}` : ""}`,
      );
      break;
    default:
      throw Error("未知卡牌类型");
  }
  for (const item of s.log) if (!logIds.has(item.id)) item.detail = true;
  const changes=s.players.filter(t=>t.cash!==balances[t.id]).map(t=>`${t.id===p.id?"":`${t.name} `}${t.cash>balances[t.id]?"+":""}${money(t.cash-balances[t.id])}`);
  record(s, `${p.name} · ${c.title}${changes.length?` · ${changes.join(" / ")}`:""}`);
  if(!s.pending.length && current(s) && s.held.includes(current(s).id) && !needsScore(s)) next(s);
  return s;
}
export function cancelCard(s, ownerId) {
  const p = player(s, ownerId);
  const shield = p?.effects.find((e) => e.key === "shield");
  if (!shield) throw Error("没有可用的取消卡");
  removeEffect(p, shield);
  const pending = s.pending.shift();
  record(
    s,
    `${p.name} 使用清醒绿茶，取消「${CARD_BY_ID[pending.cardId].title}」`,
  );
  return s;
}
export function adjust(s, id, { cash = 0, points = 0, pos, note = "" }) {
  const p = player(s, id);
  if (!p) throw Error("玩家不存在");
  if (
    !Number.isFinite(cash) ||
    Math.abs(cash) > 1000000 ||
    !Number.isInteger(points) ||
    Math.abs(points) > 999 ||
    !Number.isInteger(pos) ||
    pos < 0 ||
    pos >= 18
  )
    throw Error("请检查金额、积分与格子位置");
  if (p.points + points < 0) throw Error("积分不能小于0");
  if (cash)
    credit(s, p, cash, `主持人调整${note ? `：${note}` : ""}`, { raw: true });
  p.points += points;
  p.pos = pos;
  record(
    s,
    `${p.name} 主持人调整：积分${points >= 0 ? "+" : ""}${points}，位置第${pos}格${note ? ` · ${note}` : ""}`,
  );
  if (
    s.phase === "playing" &&
    p.points >= s.rules.cost &&
    !s.queue.includes(id)
  )
    s.queue.push(id);
  return s;
}
export function validateSave(input) {
  const s = input?.state ?? input;
  if (
    !s ||
    s.version !== 1 ||
    !["lobby", "playing", "between", "finished"].includes(s.phase) ||
    !Array.isArray(s.players) ||
    s.players.length > 20
  )
    throw Error("这不是有效的人生小岛存档");
  if (
    !s.rules ||
    !Number.isInteger(s.rules.cost) ||
    s.rules.cost < 1 ||
    s.rules.cost > 99 ||
    !Number.isFinite(s.rules.initialMoney) ||
    !Number.isFinite(s.rules.passBonus) ||
    s.rules.passBonus < 0
  )
    throw Error("存档规则损坏");
  if (
    !Number.isInteger(s.round) ||
    s.round < 0 ||
    !Number.isInteger(s.action) ||
    s.action < 0 ||
    typeof s.roundName !== "string" ||
    typeof s.acted !== "boolean"
  )
    throw Error("存档轮次损坏");
  const ids = new Set();
  for (const p of s.players) {
    if (
      typeof p.id !== "string" ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 16 ||
      !COLORS.includes(p.color) ||
      !Number.isFinite(p.cash) ||
      Math.abs(p.cash) > 1e12 ||
      !Number.isInteger(p.points) ||
      p.points < 0 ||
      !Number.isInteger(p.pos) ||
      p.pos < 0 ||
      p.pos >= 18 ||
      !Array.isArray(p.effects) ||
      !Number.isFinite(p.lastIncome) ||
      !Number.isFinite(p.roundIncome) ||
      !Number.isFinite(p.roundStart)
    )
      throw Error("存档中的玩家数据损坏");
    if(p.avatar != null && (typeof p.avatar !== "string" || p.avatar.length > 16000 || (p.avatar !== "" && !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.avatar)))) throw Error("存档头像损坏");
    ids.add(p.id);
    for (const e of p.effects) {
      if (
        typeof e.id !== "string" ||
        typeof e.key !== "string" ||
        typeof e.label !== "string" ||
        !Number.isInteger(e.createdAction) ||
        (e.turns !== undefined &&
          (!Number.isInteger(e.turns) || e.turns < 0)) ||
        (e.expiresRound !== undefined && !Number.isInteger(e.expiresRound)) ||
        (e.value !== undefined && !Number.isFinite(e.value))
      )
        throw Error("存档状态损坏");
    }
  }
  for (const key of ["queue", "order", "held"])
    if (
      !Array.isArray(s[key]) ||
      new Set(s[key]).size !== s[key].length ||
      s[key].some((id) => !ids.has(id))
    )
      throw Error("存档行动顺序损坏");
  if (
    !Array.isArray(s.deck) ||
    new Set(s.deck).size !== s.deck.length ||
    s.deck.some((id) => !Number.isInteger(id) || !CARD_BY_ID[id])
  )
    throw Error("存档牌堆损坏");
  if (
    !Array.isArray(s.pending) ||
    s.pending.some(
      (p) =>
        typeof p.id !== "string" ||
        !ids.has(p.playerId) ||
        !Number.isInteger(p.cardId) ||
        !CARD_BY_ID[p.cardId],
    )
  )
    throw Error("存档烧烧卡损坏");
  if (
    !Array.isArray(s.log) ||
    s.log.some((l) => typeof l.text !== "string" || typeof l.time !== "string")
  )
    throw Error("存档记录损坏");
  if (
    !Array.isArray(s.snapshots) ||
    s.snapshots.some(
      (r) =>
        !Number.isInteger(r.round) ||
        typeof r.name !== "string" ||
        !Array.isArray(r.players) ||
        r.players.some(
          (p) =>
            typeof p.id !== "string" ||
            typeof p.name !== "string" ||
            !Number.isFinite(p.cash) ||
            !Number.isFinite(p.change) ||
            !Number.isInteger(p.pos),
        ),
    )
  )
    throw Error("存档排名损坏");
  if (
    s.result !== null &&
    (!s.result ||
      !ids.has(s.result.playerId) ||
      !Number.isInteger(s.result.die) ||
      s.result.die < 0 ||
      s.result.die > 24 ||
      !Number.isInteger(s.result.steps))
  )
    throw Error("存档骰子结果损坏");
  if (s.phase === "playing" && ((!s.queue.length && !s.settling) || s.players.length < 2))
    throw Error("存档缺少当前玩家");
  if (s.pending.length && s.phase !== "playing")
    throw Error("存档结算状态损坏");
  if(s.rules.diceSides!==undefined&&![6,12,24].includes(s.rules.diceSides))throw Error("骰子面数无效");
  const normalized = clone(s);
  normalized.rules.diceSides??=12;
  const colors = new Set();
  for (const p of normalized.players) {
    p.effects=p.effects.filter(e=>e.key!=="voidIncome");
    if (colors.has(p.color)) p.color = COLORS.find(c=>!colors.has(c));
    colors.add(p.color);
  }
  if(normalized.turnMode !== "complete-player") {
    normalized.turnMode = "complete-player";
    normalized.held = [];
    if(normalized.phase === "playing") for(const id of normalized.order) if(player(normalized,id).points>=normalized.rules.cost && !normalized.queue.includes(id)) normalized.queue.push(id);
  }
  if(normalized.scoreMode === "on-turn") {
    if(!Array.isArray(normalized.scoreEntered) || new Set(normalized.scoreEntered).size !== normalized.scoreEntered.length || normalized.scoreEntered.some(id=>!ids.has(id))) throw Error("存档积分录入状态损坏");
  } else { normalized.scoreMode="batch"; normalized.scoreEntered=[...ids]; }
  if(normalized.roundCheckpoint) {
    const cp=normalized.roundCheckpoint;
    if(cp.roundCheckpoint || cp.round !== normalized.round-1 || cp.phase === "playing") throw Error("本轮备份损坏");
    normalized.roundCheckpoint=validateSave(cp);
  }
  normalized.roundJobs??=[];normalized.settling??=false;
  if(!Array.isArray(normalized.roundJobs)||normalized.roundJobs.some(j=>!['swap','stand','laugh','talk'].includes(j.kind)||typeof j.id!=='string'||!ids.has(j.playerId)||(['swap','talk'].includes(j.kind)&&(!ids.has(j.targetId)||j.targetId===j.playerId))))throw Error('轮末结算损坏');
  for(const p of normalized.players){p.roundNet??=money(p.cash-p.roundStart);if(!Number.isFinite(p.roundNet))throw Error('收支记录损坏');}
  delete normalized.moneyEvents;
  delete normalized.animationPaths;
  return normalized;
}
