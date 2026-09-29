import {CHARGE_MS,aimAngle} from "./dice-motion.js";
import {startChargeSound,playLaunchSound} from "./sound.js";
import {pawnRoute} from "./pawn-motion.js";
import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  Icon,
  Drawer,
  Modal,
  Select,
  Switch,
  Divider,
} from "animal-island-ui";
import * as E from "./engine.js";
import { CARDS, CARD_BY_ID } from "./cards.js";
import Awards from "./Awards.jsx";
import AvatarEditor from "./AvatarEditor.jsx";
import CardDraw from "./CardDraw.jsx";
import Dice from "./Dice.jsx";
import RoundSettlement from "./RoundSettlement.jsx";
import MoneyFlights from "./MoneyFlights.jsx";
import RankMedal from "./RankMedal.jsx";
import TurnOverlay from "./TurnOverlay.jsx";
import WalletAmount from "./WalletAmount.jsx";
import { ROLL_MS } from "./d12.js";
import { playerColor, activityEntries } from "./presentation.js";
import { prepareAudio, playDiceSound, playStepSound, playMoneySound, playLossSound, playCardSound, stopAudio } from "./sound.js";
const KEY = "life-island-save-v1";
const fmt = (n) =>
  Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: E.fresh(), history: [], rev: 0 };
    const data = JSON.parse(raw);
    const state = E.validateSave(data);
    return {
      state,
      history: (data.history || []).slice(-20).map(E.validateSave),
      rev: data.rev || 0,
    };
  } catch {
    return {
      state: E.fresh(),
      history: [],
      rev: 0,
      error:
        "原存档无法读取，已保留原数据。请先在“存档”中下载原始备份，再恢复有效存档。",
    };
  }
}
function Token({ p, small = false }) {
  return (
    <span className={`token ${small ? "small" : ""}`} style={{background:playerColor(p),color:"#0a0b0e"}} title={p.name}>
      {p.avatar?<img src={p.avatar} alt="" draggable="false"/>:<span>{Array.from(p.name)[0]}</span>}
    </span>
  );
}
function pawnSpot(p,pos,players){const group=players.filter(t=>t.pos===pos||t.id===p.id).sort((a,b)=>a.id.localeCompare(b.id));const index=Math.max(0,group.findIndex(t=>t.id===p.id));const slots=[[.16,.25],[.84,.76],[.16,.76],[.84,.25]];return slots[(index+(pos%4))%4];}
export function Pawn({p,walking=false}){return <span className={`little-person ${walking?'walking':''}`} style={{color:playerColor(p),'--idle-delay':`${-(p.id.charCodeAt(0)%7)}s`}}><span className="person-figure"><svg className="person-highlight" viewBox="0 0 40 56" aria-hidden="true"><circle cx="20" cy="17" r="20"/><path d="M10 29Q4 31 4 41Q5 47 10 46Q7 55 15 54L20 50L25 54Q33 55 30 46Q35 47 36 41Q36 31 30 29Z"/></svg><svg className="person-body" viewBox="0 0 36 30" aria-hidden="true"><path className="arm arm-left" d="M11 1Q8 4 7 7Q1 8 2 15Q3 22 9 21Q13 20 13 13L15 3Z"/><path className="arm arm-right" d="M25 1Q28 4 29 7Q35 8 34 15Q33 22 27 21Q23 20 23 13L21 3Z"/><path className="leg leg-left" d="M12 11Q11 16 10 20C5 25 8 29 13 28C18 28 18 24 18 19L19 11Z"/><path className="leg leg-right" d="M24 11Q25 16 26 20C31 25 28 29 23 28C18 28 18 24 18 19L17 11Z"/><path className="person-shirt" d="M12 0H24V19Q21 16 18 19Q15 16 12 19Z"/><path className="shirt-outline" d="M12 0V19M24 0V19" fill="none"/><circle cx="15" cy="14" r="2.3" fill="#ff285d" stroke="none"/><circle cx="21" cy="14" r="2.3" fill="#ff285d" stroke="none"/></svg><Token p={p} small/><svg className="raised-arms" viewBox="0 0 40 54" aria-hidden="true"><path d="M9 40C3 40 0 32 1 25C1 20 6 20 7 25L12 35Q14 40 9 40Z"/><path d="M31 40C37 40 40 32 39 25C39 20 34 20 33 25L28 35Q26 40 31 40Z"/></svg></span></span>;}

function ColoredText({text,players}) {
  const names=[...players].sort((a,b)=>b.name.length-a.name.length);
  if(!names.length)return text;
  const escaped=names.map(p=>p.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const parts=text.split(new RegExp(`(${escaped.join("|")})`,"g"));
  return parts.map((part,i)=>{const p=names.find(p=>p.name===part);return p?<strong key={i} style={{color:playerColor(p)}}>{part}</strong>:part;});
}
function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export default function App() {
  const [env, setEnv] = useState(load),
    ref = useRef(env);
  ref.current = env;
  const [presentation,setPresentation]=useState(null),[motion,setMotion]=useState(null),[stage,setStage]=useState("");
  const [reduced,setReduced]=useState(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [sound,setSound]=useState(()=>{try{return localStorage.getItem("life-island-sound")!=="off";}catch{return true;}});
  const [detailedLog,setDetailedLog]=useState(false);
  const [rename,setRename]=useState(null);
  const [awardsReview,setAwardsReview]=useState(false);
  const [dicePressed,setDicePressed]=useState(false),[throwPower,setThrowPower]=useState(0),[throwAngle,setThrowAngle]=useState(null);
  const aimDirection=useRef({x:0,y:0,startX:0,startY:0});
  const chargeStart=useRef(null),chargeStop=useRef(null),lastRelease=useRef(0);
  function cancelCharge(){chargeStart.current=null;setDicePressed(false);chargeStop.current?.();chargeStop.current=null;}
  function beginCharge(e){if(e.button!==undefined&&e.button!==0)return;if(chargeStart.current!==null||busyRef.current)return;chargeStart.current=performance.now();aimDirection.current={x:0,y:0,startX:e.clientX||0,startY:e.clientY||0};setDicePressed(true);if(e.pointerId!==undefined)e.currentTarget.setPointerCapture(e.pointerId);if(sound){const started=chargeStart.current;void prepareAudio().then(()=>{if(chargeStart.current===started)chargeStop.current=startChargeSound();});}}
  function moveCharge(e){if(chargeStart.current!==null)aimDirection.current={...aimDirection.current,x:e.clientX-aimDirection.current.startX,y:e.clientY-aimDirection.current.startY};}
  function releaseCharge(){if(chargeStart.current===null)return;const power=Math.min(1,(performance.now()-chargeStart.current)/CHARGE_MS);lastRelease.current=Date.now();const aim=aimDirection.current;setThrowAngle(aimAngle(aim.x,aim.y));cancelCharge();setThrowPower(power);if(sound)playLaunchSound(power);throwDice();}
  useEffect(()=>{const cancel=()=>cancelCharge();window.addEventListener('blur',cancel);const hidden=()=>{if(document.hidden)cancel();};document.addEventListener('visibilitychange',hidden);return()=>{chargeStop.current?.();window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);};},[]);
  const [sorting,setSorting]=useState(false);
  const [moneyFlight,setMoneyFlight]=useState([]);const walletRows=useRef({});
  useEffect(()=>{if(!sorting)return;const t=setTimeout(()=>setSorting(false),reduced?100:1100);return()=>clearTimeout(t);},[sorting,reduced]);
  const tileRefs=useRef([]),movingRef=useRef(null),alive=useRef(true);
  const s = presentation || env.state;
  const [tab, setTab] = useState("map"),
    [drawer, setDrawer] = useState(""),
    [notice, setNotice] = useState(env.error || ""),
    [saveError, setSaveError] = useState(env.error || ""),
    [remote, setRemote] = useState(false),
    [busy, setBusy] = useState(false),
    [die, setDie] = useState(12),
    [name, setName] = useState(""),
    [confirm, setConfirm] = useState(null),
    [cardOpen, setCardOpen] = useState(true),
    [query, setQuery] = useState("");
  const timer = useRef(null),
    file = useRef(null),
    busyRef = useRef(false);
  const p = E.current(s),
    ranks = E.ranked(s),
    pending = s.pending[0];
  useEffect(()=>{const mq=matchMedia("(prefers-reduced-motion: reduce)");const onChange=()=>setReduced(mq.matches);mq.addEventListener("change",onChange);return()=>mq.removeEventListener("change",onChange);},[]);
  useEffect(() => {
    alive.current=true;busyRef.current=false;setBusy(false);setPresentation(null);setMotion(null);setStage("");
    const listener = (e) => {
      if (e.key === KEY) setRemote(true);
    };
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("storage", listener);
      alive.current=false;
      clearTimeout(timer.current);
      stopAudio();
    };
  }, []);
  useEffect(() => {
    if (notice && !saveError) {
      const t = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(t);
    }
  }, [notice, saveError]);
  function persist(next) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaveError("");
    } catch {
      setSaveError("浏览器保存失败，请立即导出存档备份。");
    }
    ref.current = next;
    setEnv(next);
  }
  function commit(fn) {
    if (remote) {
      setNotice("另一窗口已更改这场游戏，请重新加载后继续。");
      return false;
    }
    if (busyRef.current) {
      return false;
    }
    try {
      const before = ref.current.state;
      const after = E.clone(before);
      fn(after);
      delete after.animationPaths;delete after.moneyEvents;
      persist({
        state: after,
        history: [...ref.current.history, before].slice(-20),
        rev: ref.current.rev + 1,
      });
      return true;
    } catch (e) {
      setNotice(e.message);
      return false;
    }
  }
  function undo() {
    if (!env.history.length || busy) return;
    const history = [...env.history],
      state = history.pop();
    persist({ state, history, rev: env.rev + 1 });
    setNotice("已撤销上一步");
  }
  function add() {
    const names = name
      .split(/[,，、\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;
    const ok = commit((d) => names.forEach((n) => E.addPlayer(d, n)));
    if (ok) setName("");
    return ok;
  }
  function flyMoney(events){
    const loss=events.filter(e=>e.amount<0).reduce((a,e)=>a-e.amount,0);if(sound&&loss)playLossSound(loss);
    const groups=events.filter(e=>e.amount>0).map((e,i)=>{
      const source=e.sourceId?walletRows.current[e.sourceId]:tileRefs.current[e.tile];const rect=source?.getBoundingClientRect();
      return {...e,key:crypto.randomUUID(),from:rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:{x:innerWidth/2,y:innerHeight/2}};
    });
    if(groups.length)setMoneyFlight(previous=>[...previous,{id:crypto.randomUUID(),groups}]);
  }
  async function animateAction(fn, rollValue=null) {
    if(busyRef.current||remote)return false;
    const before=E.clone(ref.current.state),after=E.clone(before);
    try{fn(after);}catch(error){setNotice(error.message);return false;}
    const paths=after.animationPaths||[];const moneyEvents=after.moneyEvents||[];delete after.animationPaths;delete after.moneyEvents;
    const audioReady=sound?prepareAudio():Promise.resolve(null);
    // 先保存完整结算；动画只影响展示。刷新不会重复扣分或重复领奖。
    busyRef.current=true;setBusy(true);setCardOpen(false);setPresentation(before);
    persist({state:after,history:[...ref.current.history,before].slice(-20),rev:ref.current.rev+1});
    const delay=ms=>new Promise(resolve=>{timer.current=setTimeout(resolve,ms);});
    if(rollValue!==null){
      setDie(rollValue);setStage("rolling");
      if(sound){void prepareAudio().then(ctx=>{if(ctx&&alive.current&&busyRef.current)playDiceSound();});}
      await delay(reduced?100:ROLL_MS);
    }
    let visual=E.clone(before);
    for(const [pathIndex,path] of paths.entries()){
      if(!alive.current)return;
      setStage("moving");
      const t=E.player(visual,path.playerId);if(!t)continue;
      const count=Math.abs(path.steps);
      const positions=Array.from({length:count+1},(_,step)=>((path.from+Math.sign(path.steps)*step)%E.BOARD.length+E.BOARD.length)%E.BOARD.length);
      const points=positions.map((pos,step)=>{
        const tile=tileRefs.current[pos];
        const spot=step===0||step===count?pawnSpot(t,pos,visual.players):[.5,.5];
        return {x:tile?tile.offsetLeft+Math.max(18,Math.min(tile.offsetWidth-18,tile.offsetWidth*spot[0])):0,y:tile?tile.offsetTop+Math.max(22,Math.min(tile.offsetHeight-22,tile.offsetHeight*spot[1])):0};
      });
      setMotion({playerId:path.playerId,pos:path.from,step:0,...points[0]});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const arrive=step=>{
        const pos=positions[step];t.pos=pos;
        if(sound&&!reduced)playStepSound();
        if(!reduced&&tileRefs.current[pos])tileRefs.current[pos].animate([{transform:'scale(1)'},{transform:'translateY(8px) scale(1.12,.82)',offset:.3},{transform:'translateY(-5px) scale(.94,1.12)',offset:.7},{transform:'none'}],{duration:340});
        const passing=moneyEvents.filter(e=>e.atPath===pathIndex&&e.atStep===step);
        if(passing.length){for(const e of passing)E.player(visual,e.playerId).cash+=e.amount;setPresentation(E.clone(visual));flyMoney(passing);}
        if(step===count&&tileRefs.current[pos])tileRefs.current[pos].animate([{background:'#ffbf1f',color:'#0a0b0e'},{background:'#ffbf1f',color:'#0a0b0e',offset:.65},{}],{duration:950});
      };
      if(reduced){for(let step=1;step<=count;step++)arrive(step);}
      else if(count){
        const route=pawnRoute(points),duration=count*230;
        await new Promise(resolve=>{
          let start=null,sample=1,nextStep=1;
          const frame=now=>{
            if(!alive.current){resolve();return;}
            if(start===null)start=now;
            const progress=Math.min(1,(now-start)/duration),distance=progress*route.distance;
            while(sample<route.samples.length-1&&route.samples[sample].distance<distance)sample++;
            const a=route.samples[sample-1],b=route.samples[sample],mix=(distance-a.distance)/(b.distance-a.distance||1);
            if(movingRef.current)movingRef.current.style.transform=`translate(${a.x+(b.x-a.x)*mix}px,${a.y+(b.y-a.y)*mix}px)`;
            while(nextStep<=count&&distance>=route.arrivals[nextStep]-0.001)arrive(nextStep++);
            if(progress<1)requestAnimationFrame(frame);else resolve();
          };
          requestAnimationFrame(frame);
        });
      }
    }
    if(!alive.current)return;
    if(sound){
      await audioReady;
      if(!alive.current)return;
      const gained=after.players.some(t=>t.cash>(E.player(before,t.id)?.cash??t.cash));
      const drawn=after.pending.some(c=>!before.pending.some(old=>old.id===c.id));
      if(drawn)playCardSound();
    }
    flyMoney(moneyEvents.filter(e=>e.atPath===undefined));
    setPresentation(null);setMotion(null);setStage("");busyRef.current=false;setBusy(false);setCardOpen(true);
    return true;
  }
  function throwDice() {
    const state=ref.current.state,active=E.current(state);
    if(busyRef.current||!active||active.points<state.rules.cost||state.pending.length)return;
    const special=active.effects.some(e=>e.key==="skip"||e.key==="giveRoll");
    const final=E.integer(1,state.rules.diceSides||12);
    void animateAction(d=>{if(d.acted)E.next(d);E.roll(d,final);},special?null:final);
  }
  function download(data, filename) {
    const blob = new Blob(
        [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportSave() {
    download(
      { app: "人生小岛", exportedAt: new Date().toISOString(), state: s },
      `人生小岛-第${s.round}轮-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
  async function importFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 5000000) throw Error("存档文件过大");
      const incoming = E.validateSave(JSON.parse(await f.text()));
      setConfirm({
        title: "载入这份存档？",
        body: `${incoming.players.length} 位玩家 · 第 ${incoming.round} 轮。当前进度会先自动下载备份，载入后也可以撤销。`,
        action: () => {
          exportSave();
          if (
            commit((d) => {
              Object.keys(d).forEach((k) => delete d[k]);
              Object.assign(d, incoming);
            })
          ) {
            setDrawer("");
            setCardOpen(true);
            setNotice("存档已载入");
          }
        },
      });
    } catch (err) {
      setNotice(`无法导入：${err.message}`);
    }
  }
  const blocked = busy || remote || sorting;
  const activity=activityEntries(s.log);
  const remaining=p&&!s.held.includes(p.id)?Math.floor(p.points/s.rules.cost):0;
  const nextPlayer=E.player(s,s.queue.find(id=>id!==p?.id&&!s.held.includes(id)&&(E.needsScore(s,id)||E.player(s,id)?.points>=s.rules.cost)));
  const flowPanel=<section className="flow-panel" aria-label="出场顺序与当前玩家">
    <div className="heading-inline"><h3>{p?"当前玩家":s.phase==="finished"?"本局结束":s.phase==="between"?"本轮完成":"出场顺序"}</h3><span className="phase-tag">{stage==="rolling"?"掷骰中":stage==="moving"?"移动中":pending?"待结算":p&&E.needsScore(s)?"待录入":p?remaining?"进行中":"已用完":""}</span></div>
    {p?<><div key={p.id+"-"+s.round+"-"+E.needsScore(s)} className="active-player turn-spotlight"><Token p={p}/><div><strong style={{color:playerColor(p)}}>{p.name}</strong><p className="remaining-rolls">剩 <b>{remaining}</b> 次 <span>· 余 {p.points%s.rules.cost} 分</span></p></div></div><div className="next-player"><span>下一位</span>{nextPlayer?<strong style={{color:playerColor(nextPlayer)}}>{nextPlayer.name}</strong>:<strong>本轮最后一位</strong>}</div></>:<p className="muted">{s.phase==="finished"?"成绩已保存":s.phase==="between"?"余分已保留":"每轮随机排序"}</p>}
    <div className="order-list">{(s.order.length?s.order:s.players.map(t=>t.id)).map((id,i)=>{const t=E.player(s,id);if(!t)return null;const done=s.round>0&&!E.needsScore(s,id)&&t.points<s.rules.cost&&t.id!==p?.id;return <div key={id} className={`order-chip ${id===p?.id?"selected":""} ${done?"done":""}`}><span className="order-index">{i+1}</span><Token p={t} small/><span style={{color:playerColor(t)}}>{t.name}</span><small>{id===p?.id?"当前":done?"完成":E.needsScore(s,id)?"待录入":`${Math.floor(t.points/s.rules.cost)}次`}</small></div>;})}</div>
  </section>;
  const activityPanel=<section className="activity-panel"><div className="heading-inline"><h3>动态</h3><Button type="text" size="small" onClick={()=>setDrawer("log")}>全部</Button></div><div className="activity-list" aria-live="polite">{activity.slice(0,3).map(l=><p className="activity" key={l.id}><ColoredText text={l.text} players={s.players}/></p>)}{!activity.length&&<p className="muted">暂无动态</p>}</div></section>;
  const openRound = () => {
    if(commit(d=>E.startRound(d))) {setSorting(true);setTab("map");setCardOpen(true);}
  };
  const topActions = (
    <div className="inline">
      <Button size="small" aria-pressed={sound} onClick={()=>{const next=!sound;setSound(next);if(!next)stopAudio();try{localStorage.setItem("life-island-sound",next?"on":"off");}catch{}}}>{sound?"音效开":"音效关"}</Button>
      <Button
        size="small"
        disabled={blocked || !env.history.length}
        onClick={undo}
      >
        撤销
      </Button>
      {s.roundCheckpoint && s.phase!=="finished" && <Button size="small" disabled={blocked} onClick={()=>setConfirm({title:"重来当前轮？",body:"恢复本轮开始前的钱、积分和位置，重新排序。可以撤销。",action:()=>{if(commit(E.restartRound)){setSorting(true);setTab("map");setCardOpen(true);setDrawer("");}}})}>重来当前轮</Button>}
      <Button size="small" disabled={blocked} onClick={()=>setConfirm({title:"重新开始本局？",body:"清空本局的钱、积分、位置和轮次，保留玩家名字、头像和颜色。可以撤销。",action:()=>{if(commit(E.restartGame)){setAwardsReview(false);setSorting(false);setTab("map");setDrawer("");setCardOpen(false);}}})}>重新开始本局</Button>
      <Button size="small" disabled={blocked} onClick={() => setDrawer("save")}>
        存档
      </Button>
      <Button
        size="small"
        disabled={blocked||s.phase==="finished"}
        onClick={() => setDrawer("players")}
        icon={<Icon name="icon-design" size={18} />}
      >
        管理
      </Button>
    </div>
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="icon-map" size={40} />
          </div>
          <div>
            <h1>人生小岛</h1>
          </div>
        </div>
        <div className="header-right">
          <span className={`save-status ${saveError ? "warning" : ""}`}>
            {saveError ? "存档需备份" : "本机已保存"}
          </span>
          {topActions}
        </div>
      </header>
      {remote && (
        <div className="alert">
          另一窗口已更新本场游戏。为避免覆盖，请先重新加载。
          <Button size="small" onClick={() => location.reload()}>
            重新加载
          </Button>
        </div>
      )}
      {saveError && (
        <div className="alert">
          {saveError}
          <Button size="small" onClick={exportSave}>
            导出当前存档
          </Button>
          <Button
            size="small"
            onClick={() =>
              download(localStorage.getItem(KEY) || "", "原始存档备份.json")
            }
          >
            下载原始备份
          </Button>
        </div>
      )}
      <div className="sub-header">
        <nav aria-label="主要页面">
          <Button
            type={tab === "map" ? "primary" : "text"}
            size="small"
            onClick={() => setTab("map")}
            icon={<Icon name="icon-map" size={18} />}
          >
            人生地图
          </Button>
          <Button
            type={tab === "history" ? "primary" : "text"}
            size="small"
            onClick={() => setTab("history")}
          >
            每轮排名
          </Button>
          <Button
            type={tab === "cards" ? "primary" : "text"}
            size="small"
            onClick={() => setTab("cards")}
          >
            烧烧卡图鉴 <span className="count">80</span>
          </Button>
        </nav>
        <Button type="text" size="small" onClick={() => setDrawer("rules")}>
          玩法说明
        </Button>
      </div>
      {tab === "map" && (
        <>
          <div className="game-layout">
            <div className="map-column"><section className="map-section" aria-label="游戏地图">
              <div className="section-top">
                <div>
                  <h2>
                    {s.phase === "lobby"
                      ? "人生地图"
                      : s.phase === "playing"
                        ? s.roundName
                        : s.phase==="finished"?"本局结束":"本轮结束"}
                  </h2>
                </div>
                <div className="round-tools"><button className="dice-selector" disabled={blocked||s.phase==="playing"} title={s.phase==="playing"?"下轮开始前可切换":"切换骰子"} onClick={()=>commit(d=>{const list=[6,12,24];d.rules.diceSides=list[(list.indexOf(d.rules.diceSides||12)+1)%3];})}>{s.rules.diceSides||12} 面骰 ↻</button><div className="round-pill">
                  {s.round ? `第 ${s.round} 轮` : "待开始"}
                </div></div>
              </div>
              <div className="board">
                <div className="board-center">
                  <div className="center-island">
                    <strong className="center-player" style={{color:p?playerColor(p):undefined}}>
                      {p
                        ? p.name
                        : s.phase === "between"
                          ? "本轮结束"
                          : s.phase==="finished"?"本局结束":"准备开局"}
                    </strong>
                    <button className="dice-hitbox" aria-label="掷骰子" disabled={blocked||s.phase!=="playing"||E.needsScore(s)||!!pending||remaining<1} onPointerDown={beginCharge} onPointerMove={moveCharge} onPointerUp={releaseCharge} onPointerCancel={cancelCharge} onLostPointerCapture={cancelCharge} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancelCharge();}else if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)beginCharge(e);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();releaseCharge();}}} onBlur={cancelCharge} onContextMenu={e=>e.preventDefault()} onClick={e=>{if(e.detail===0&&Date.now()-lastRelease.current>400){setThrowPower(0);setThrowAngle(null);throwDice();}}}><span className="dice-wrap">
                      <Dice
                        pressed={dicePressed}
                        power={throwPower}
                        launchAngle={throwAngle}
                        aim={aimDirection}
                        sound={sound}
                        sides={s.rules.diceSides||12}
                        value={Math.min(s.rules.diceSides||12,busy ? die : s.result?.die || (s.rules.diceSides||12))}
                        rolling={stage === "rolling"}
                        reduced={reduced}
                      />
                    </span></button>
                    {s.phase === "lobby" ? (
                      <>
                        <Button
                          type="primary"
                          size="large"
                          disabled={s.players.length < 2 || blocked}
                          onClick={openRound}
                        >
                          {s.players.length < 2
                            ? "至少添加 2 人"
                            : "开始第一轮"}
                        </Button>
                      </>
                    ) : s.phase === "finished" ? (
                      <Button type="primary" onClick={()=>setAwardsReview(true)}>最终排名</Button>
                    ) : s.phase === "between" ? (
                      <>
                        <Button
                          type="primary"
                          size="large"
                          disabled={blocked}
                          onClick={openRound}
                        >
                          开始下一轮
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="center-copy">{stage==="rolling"?`${s.rules.diceSides||12} 面骰`:stage==="moving"?"前进中…":s.acted?(s.result?.skipped?s.result.description||"暂停一次":`前进 ${s.result?.steps} 格`):`${s.rules.diceSides||12} 面骰`}</p>
                        {busy?<p className="dice-hint">{stage==="rolling"?"掷骰中…":"移动中…"}</p>:pending?<Button type="primary" size="large" onClick={()=>setCardOpen(true)}>结算烧烧卡</Button>:remaining>0?<p className="dice-hint">按住蓄力 · 拖动瞄准</p>:<Button type="primary" size="large" disabled={blocked} onClick={()=>animateAction(E.next)}>{nextPlayer?"下一位":"本轮结算"}</Button>}

                      </>
                    )}
                  </div>
                  <div className="meadow meadow-a" />
                  <div className="meadow meadow-b" />
                  <span className="center-flower flower-a" />
                  <span className="center-flower flower-b" />
                </div>
                {E.BOARD.map((value, i) => {
                  const here = s.players.filter((x) => x.pos === i && x.id !== motion?.playerId);
                  const active = p?.pos === i;
                  return (
                    <div
                      key={i}
                      ref={el=>tileRefs.current[i]=el}
                      title={s.players.filter(t=>t.pos===i).map(t=>t.name).join("、")}
                      className={`tile ${value === "sao" ? "chance" : i === 0 ? "start" : "cash"} ${active ? "active" : ""}`}
                      style={{
                        gridColumn: E.POSITIONS[i][0] + 1,
                        gridRow: E.POSITIONS[i][1] + 1,
                      }}
                      aria-label={`${i === 0 ? "起点" : `第${i}格`}，${value === "sao" ? "烧烧卡" : `${value}元`}，${here.map((x) => x.name).join("、")}`}
                    >
                      {value === "sao" ? (
                        <>
                          <span className="sao-label">Sao</span>
                        </>
                      ) : (
                        <>
                          <span className="tile-amount">
                            <small>$</small>
                            {i === 0 ? s.rules.passBonus : value}
                          </span>
                          <>
                            {i === 0 && (
                              <span className="tile-caption">起点</span>
                            )}
                          </>
                        </>
                      )}
                      {here.length > 0 && (
                        <div className="tile-tokens">
                          {here.slice(0, 4).map((t) => (
                            <span key={t.id+"-"+(t.id===p?.id&&!E.needsScore(s))} className={`pawn-slot ${t.id===p?.id?"turn-token":""}`} style={{left:`clamp(18px, ${pawnSpot(t,i,s.players)[0]*100}%, calc(100% - 18px))`,top:`clamp(22px, ${pawnSpot(t,i,s.players)[1]*100}%, calc(100% - 22px))`}}><Pawn p={t}/></span>
                          ))}
                          {here.length > 4 && (
                            <span className="overflow-token">
                              +{here.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {motion&&<div ref={movingRef} className="moving-pawn" data-step={motion.step} style={{transform:`translate(${motion.x}px, ${motion.y}px)`}}><div key={motion.step} className="pawn-step"><div className="pawn-hop"><Pawn p={E.player(s,motion.playerId)} walking/></div></div></div>}
              </div>
            </section>{activityPanel}</div>
            <aside className="sidebar">{flowPanel}
              <section className="leaderboard">
                <div className="sidebar-heading">
                  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M3 24V13h7v11m0 0V5h8v19m0 0V17h7v7M2 24h24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>
                  <div>
                    <h2>排行榜</h2>
                  </div>
                  <button className="add-player-icon" aria-label="添加玩家" title={s.phase==="playing"?"本轮结束后添加玩家":"添加玩家"} disabled={blocked||s.phase==="playing"||s.phase==="finished"} onClick={()=>setDrawer("add")}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></button>
                </div>
                {!ranks.length ? (
                  <div className="empty-rank">
                    <Icon name="location" size={68} />
                    <h3>还没有玩家</h3>
                  </div>
                ) : (
                  <div className="ranking-list">
                    {ranks.map((t, i) => (
                      <div
                        className={`rank-row ${t.id === p?.id ? "current" : ""}`}
                        key={t.id}
                        ref={el=>{walletRows.current[t.id]=el;}}
                      >
                        <RankMedal rank={ranks.findIndex(x=>x.cash===t.cash)+1}/>
                        <Token p={t} small />
                        <div className="rank-player">
                          <button className="rename-player" disabled={blocked} style={{color:playerColor(t)}} aria-label={`编辑${t.name}`} onClick={()=>setRename(t.id)}>{t.name}</button>
                          <small>
                            {t.points} 积分
                            {t.effects.length
                              ? ` · ${t.effects.length}个状态`
                              : ""}
                          </small>
                        </div>
                        <WalletAmount value={t.cash} reduced={reduced} arrivalDelay={moneyFlight.some(batch=>batch.groups.some(g=>g.playerId===t.id))?810:0}/>
                      </div>
                    ))}
                  </div>
                )}

              </section>
            </aside>
          </div>
          {s.players.some((x) => x.effects.length > 0) && (
            <section className="effects-panel">
              <h3>生效状态</h3>
              <div className="effect-list">
                {s.players.flatMap((t) =>
                  t.effects.map((e) => (
                    <div className="effect-chip" key={e.id}>
                      <Token p={t} small />
                      <span>
                        <b>{t.name}</b> · {e.label}
                        {e.turns ? `（剩${e.turns}次行动）` : ""}
                      </span>
                      {e.key === "manual" && (
                        <Button
                          size="small"
                          onClick={() => setDrawer("players")}
                        >
                          处理
                        </Button>
                      )}
                    </div>
                  )),
                )}
              </div>
            </section>
          )}
        </>
      )}
      {tab === "history" && (
        <section className="page-panel">
          <div className="page-title">
            <h2>每轮排名</h2>
          </div>
          {!s.snapshots.length ? (
            <div className="large-empty">
              <Icon name="icon-encyclopedia" size={72} />
              <h3>暂无记录</h3>
              <Button onClick={() => setTab("map")}>回到地图</Button>
            </div>
          ) : (
            <div className="history-grid">
              {[...s.snapshots].reverse().map((r) => (
                <article className="history-card" key={r.round}>
                  <div className="heading-inline">
                    <h3>第 {r.round} 轮</h3>
                    <span>{r.name}</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>排名 / 玩家</th>
                        <th>资金</th>
                        <th>本轮变化</th>
                        <th>位置</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.players.map((x, i) => (
                        <tr key={x.id}>
                          <td>
                            {r.players.findIndex((y) => y.cash === x.cash) + 1}.{" "}
                            {x.name}
                          </td>
                          <td>${fmt(x.cash)}</td>
                          <td
                            className={x.change >= 0 ? "positive" : "negative"}
                          >
                            {x.change >= 0 ? "+" : ""}
                            {fmt(x.change)}
                          </td>
                          <td>{x.pos === 0 ? "起点" : `${x.pos}格`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === "cards" && (
        <section className="page-panel">
          <div className="page-title">
            <h2>烧烧卡</h2>
            <Input
              aria-label="搜索烧烧卡"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索卡牌"
              allowClear
            />
          </div>
          <div className="card-gallery">
            {CARDS.filter((c) => (c.title + c.text).includes(query)).map(
              (c) => (
                <article className="fate-gallery-card" key={c.id}>
                  <div className="heading-inline">
                    <span className="small-sao">Sao</span>
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <footer>
                    {c.kind === "manual" ? "主持人现场裁定" : "按规则结算"}
                    <a
                      href={`./卡牌${c.page}.png`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      原卡图
                    </a>
                  </footer>
                </article>
              ),
            )}
          </div>
          {!CARDS.some((c) => (c.title + c.text).includes(query)) && (
            <p className="large-empty">没有找到这张卡。</p>
          )}
        </section>
      )}

      {rename&&s.players.some(t=>t.id===rename)&&<AvatarEditor key={rename} player={s.players.find(t=>t.id===rename)} disabled={blocked} onClose={()=>setRename(null)} onSave={(name,avatar)=>{if(commit(d=>{if(!name||name.length>16)throw Error("名字最多16个字");if(d.players.some(t=>t.id!==rename&&t.name===name))throw Error("名字已存在");Object.assign(E.player(d,rename),{name,avatar});}))setRename(null);}}/>}
      <Modal open={drawer==="add"} title="添加玩家" typewriter={false} onClose={()=>setDrawer("")} footer={<Button type="primary" disabled={blocked||!name.trim()} onClick={()=>{if(add())setDrawer("");}}>添加</Button>}>
        <Input aria-label="玩家名字" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing&&add())setDrawer("");}} placeholder="名字，逗号分隔"/>
      </Modal>
      <Drawer
        open={drawer === "players"}
        title="岛民与规则"
        width={560}
        onClose={() => setDrawer("")}
        pushBackground={false}
      >
        {drawer === "players" && (
          <PlayerManager
            s={s}
            commit={commit}
            setNotice={setNotice}
            confirm={setConfirm}
            blocked={blocked}
          />
        )}
      </Drawer>
      <Drawer
        open={drawer === "save"}
        title="带上你的旅行存档"
        width={460}
        onClose={() => setDrawer("")}
        pushBackground={false}
      >
        <div className="drawer-content">
          <Icon name="icon-diy" size={64} />
          <h3>
            {s.players.length} 位玩家 · 第 {s.round} 轮
          </h3>
          <p>进度自动保存在当前浏览器。换电脑、清理浏览器前，请先下载存档。</p>
          <Button type="primary" block onClick={exportSave}>
            导出游戏存档
          </Button>
          <Button block disabled={blocked} onClick={() => file.current.click()}>
            从文件恢复进度
          </Button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={importFile}
          />
          <Divider type="dashed-brown" />
          <p className="muted">新建活动前会先自动下载当前备份。</p>
          <Button
            danger
            block
            disabled={blocked}
            onClick={() =>
              setConfirm({
                title: "开启一场全新的活动？",
                body: "当前玩家、积分与轮次将清空。系统会先下载备份；也可通过撤销恢复。",
                action: () => {
                  exportSave();
                  if (
                    commit((d) => {
                      Object.keys(d).forEach((k) => delete d[k]);
                      Object.assign(d, E.fresh());
                    })
                  ) {
                    setDrawer("");
                    setTab("map");
                  }
                },
              })
            }
          >
            新建活动
          </Button>
        </div>
      </Drawer>
      <Drawer
        open={drawer === "rules"}
        title="小岛游玩手册"
        width={560}
        onClose={() => setDrawer("")}
        pushBackground={false}
      >
        <Rules s={s} />
      </Drawer>
      <Drawer
        open={drawer === "log"}
        title="完整旅行记录"
        width={560}
        onClose={() => setDrawer("")}
        pushBackground={false}
      >
        <div className="drawer-content">
          <div className="switch-row"><span>详细记录</span><Switch checked={detailedLog} onChange={setDetailedLog}/></div>
          {(detailedLog?s.log:activity).map((l) => (
            <div className="full-log" key={l.id}>
              <small>
                第 {l.round} 轮 · {new Date(l.time).toLocaleTimeString("zh-CN")}
              </small>
              <p><ColoredText text={l.text} players={s.players}/></p>
            </div>
          ))}
          {!s.log.length && <p>还没有记录。</p>}
        </div>
      </Drawer>
      <CardDialog
        open={!!pending && cardOpen && !busy}
        title="烧烧卡"
        width={560}
        maskClosable={false}
        onClose={() => setCardOpen(false)}
        pushBackground={false}
      >
        {pending && (
          <CardDraw companion={<Pawn p={E.player(s,pending.playerId)}/>} key={pending.id} revealed={pending.revealed} name={E.player(s,pending.playerId)?.name} reduced={reduced} sound={sound} onReveal={()=>commit(d=>{const card=d.pending.find(c=>c.id===pending.id);if(card)card.revealed=true;})}>
          <CardResolver
            key={pending.id}
            pending={pending}
            s={s}
            onResolve={(form) => animateAction((d) => E.resolve(d, form))}
            onCancel={(id) => commit((d) => E.cancelCard(d, id))}
          />
          </CardDraw>
        )}
      </CardDialog>
      <Modal
        open={!!confirm}
        title={confirm?.title}
        typewriter={false}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>再想想</Button>
            <Button
              type="primary"
              onClick={() => {
                const c = confirm;
                setConfirm(null);
                c?.action();
              }}
            >
              确认
            </Button>
          </>
        }
      >
        <p>{confirm?.body}</p>
      </Modal>
      {moneyFlight.map(batch=><MoneyFlights key={batch.id} batch={batch} rows={walletRows} reduced={reduced} sound={sound} onDone={()=>setMoneyFlight(all=>all.filter(b=>b.id!==batch.id))}/>)}
      {((s.phase==="between"&&s.awardsPending)||awardsReview)&&!busy&&!moneyFlight.length&&<Awards s={s} Pawn={Pawn} disabled={blocked} onDice={()=>commit(d=>{const list=[6,12,24];d.rules.diceSides=list[(list.indexOf(d.rules.diceSides||12)+1)%3];})} onContinue={openRound} onFinish={()=>commit(E.finishGame)} onClose={()=>setAwardsReview(false)}/>}
      {s.settling&&!busy&&<RoundSettlement s={s} disabled={blocked} onConfirm={answers=>animateAction(d=>E.settleRound(d,answers))}/>}
      {(sorting || (s.phase==="playing" && p && E.needsScore(s) && !busy)) && <TurnOverlay key={`${s.round}-${p?.id}-${sorting}`} player={p} players={s.order.map(id=>E.player(s,id))} sorting={sorting} carry={p?.points||0} disabled={remote} onConfirm={value=>commit(d=>E.enterScore(d,value))}/>}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <Button type="text" size="small" onClick={() => setNotice("")}>
            关闭
          </Button>
        </div>
      )}
    </div>
  );
}
function PlayerManager({ s, commit, setNotice, confirm, blocked }) {
  const [id, setId] = useState(s.players[0]?.id || ""),
    [cash, setCash] = useState("0"),
    [points, setPoints] = useState("0"),
    [pos, setPos] = useState(null),
    [note, setNote] = useState(""),
    [newName, setNewName] = useState("");
  const p = E.player(s, id);
  const [cost, setCost] = useState(String(s.rules.cost)),
    [initial, setInitial] = useState(String(s.rules.initialMoney)),
    [bonus, setBonus] = useState(String(s.rules.passBonus));
  return (
    <div className="drawer-content">
      <h3>添加岛民</h3>
      <div className="inline">
        <Input
          aria-label="新玩家名字"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="玩家名字"
          maxLength={16}
        />
        <Button
          disabled={s.phase === "playing" || blocked || !newName.trim()}
          onClick={() => {
            if (commit((d) => E.addPlayer(d, newName))) setNewName("");
          }}
        >
          添加
        </Button>
      </div>
      {s.phase === "playing" && <small>当前轮结束后可以添加新玩家。</small>}
      <Divider type="dashed-brown" />
      <h3>主持人调整</h3>
      <p className="muted">
        金额填变化值，例如 −50 表示扣款。位置修改不会触发格子奖励或抽卡。
      </p>
      {s.players.length > 0 && (
        <>
          <Select
            options={s.players.map((t) => ({ key: t.id, label: t.name }))}
            value={id}
            onChange={(v) => {
              setId(v);
              setPos(null);
            }}
          />
          <Button size="small" onClick={()=>{setId(E.shuffle(s.players)[0].id);setPos(null);}}>随机选择</Button>
          {p && (
            <>
              <div className="two-fields">
                <Field label={`金额变化（当前 $${fmt(p.cash)}）`}>
                  <Input
                    aria-label="金额变化"
                    type="number"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                  />
                </Field>
                <Field label={`积分变化（当前 ${p.points}）`}>
                  <Input
                    aria-label="积分变化"
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="调整到地图格子">
                <Select
                  value={String(pos ?? p.pos)}
                  onChange={(v) => setPos(Number(v))}
                  options={E.BOARD.map((v, i) => ({
                    key: String(i),
                    label:
                      i === 0
                        ? "00 · 起点"
                        : `${String(i).padStart(2, "0")} · ${v === "sao" ? "烧烧卡" : `${v}元`}`,
                  }))}
                />
              </Field>
              <Input
                aria-label="调整原因"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="写个原因，方便回看"
              />
              <Button
                disabled={blocked || s.pending.length > 0}
                onClick={() => {
                  if (
                    commit((d) =>
                      E.adjust(d, id, {
                        cash: Number(cash),
                        points: Number(points),
                        pos: pos ?? p.pos,
                        note,
                      }),
                    )
                  ) {
                    setCash("0");
                    setPoints("0");
                    setNote("");
                    setNotice("调整已记录");
                  }
                }}
              >
                保存调整
              </Button>
              {s.pending.length > 0 && (
                <small>请先在烧烧卡面板完成结算，再调整玩家。</small>
              )}
              {p.effects.map((e) => (
                <div className="effect-manager" key={e.id}>
                  <span>{e.label}</span>
                  <Button
                    size="small"
                    disabled={blocked}
                    onClick={() =>
                      confirm({
                        title: "移除这个状态？",
                        body: e.label,
                        action: () =>
                          commit((d) => {
                            const t = E.player(d, id);
                            t.effects = t.effects.filter((x) => x.id !== e.id);
                            E.record(
                              d,
                              `${t.name} 的状态「${e.label}」已由主持人移除`,
                            );
                          }),
                      })
                    }
                  >
                    已处理 / 移除
                  </Button>
                </div>
              ))}
              {s.round === 0 && (
                <Button
                  danger
                  size="small"
                  disabled={blocked}
                  onClick={() =>
                    confirm({
                      title: `移除${p.name}？`,
                      body: "仅开局前可移除玩家。",
                      action: () => {
                        if (
                          commit((d) => {
                            d.players = d.players.filter((t) => t.id !== id);
                            E.record(d, `${p.name} 已离岛`);
                          })
                        ) {
                          setId(s.players.find((t) => t.id !== id)?.id || "");
                        }
                      },
                    })
                  }
                >
                  移除玩家
                </Button>
              )}
            </>
          )}
        </>
      )}
      <Divider type="dashed-brown" />
      <h3>基础规则</h3>
      <Field label="每次掷骰消耗积分">
        <Input
          type="number"
          min="1"
          max="99"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          aria-label="掷骰消耗积分"
        />
      </Field>
      <Field
        label="新玩家初始资金"
        hint="只影响以后添加的玩家；已有玩家请使用金额调整。"
      >
        <Input
          type="number"
          value={initial}
          onChange={(e) => setInitial(e.target.value)}
          aria-label="初始资金"
        />
      </Field>
      <Field label="经过起点奖励">
        <Input
          type="number"
          min="0"
          value={bonus}
          onChange={(e) => setBonus(e.target.value)}
          aria-label="起点奖励"
        />
      </Field>
      <Button
        disabled={s.phase === "playing" || blocked}
        onClick={() => {
          if (
            commit((d) => {
              const c = Number(cost),
                i = Number(initial),
                b = Number(bonus);
              if (
                !Number.isInteger(c) ||
                c < 1 ||
                c > 99 ||
                !Number.isFinite(i) ||
                Math.abs(i) > 1000000 ||
                !Number.isFinite(b) ||
                b < 0 ||
                b > 1000000
              )
                throw Error("请填写有效规则数值");
              d.rules = { cost: c, initialMoney: i, passBonus: b };
              E.record(d, "主持人更新基础规则");
            })
          )
            setNotice("规则已保存");
        }}
      >
        保存规则
      </Button>
      {s.phase === "playing" && (
        <small>为保证本轮一致，轮次结束后可修改基础规则。</small>
      )}
    </div>
  );
}
function CardResolver({ pending, s, onResolve, onCancel }) {
  const c = CARD_BY_ID[pending.cardId],
    p = E.player(s, pending.playerId),
    others = s.players.filter((t) => t.id !== p.id),
    options = others.map((t) => ({
      key: t.id,
      label: `${t.name} · $${fmt(t.cash)}`,
    }));
  const [target, setTarget] = useState(""),
    [target2, setTarget2] = useState(""),
    [choice, setChoice] = useState(""),
    [number, setNumber] = useState(""),
    [deltas, setDeltas] = useState({}),
    [remind, setRemind] = useState(false),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const two = ["party", "payTwo", "twoDraw"].includes(c.kind),
    one = [
      "transfer",
      "targetMoney",
      "bail",
      "giveRoll",
      "richSplit",
      "duel", "mirror", "swap", "emperor", "talk", "photo",
    ].includes(c.kind);
  const choiceOptions =
    ["buy","photo"].includes(c.kind)?[{key:"yes",label:c.kind==="buy"?"支付30购买":"配合摆拍"},{key:"no",label:c.kind==="buy"?"不购买":"拒绝出镜"}]:
    c.kind === "payOrSkip"
      ? [
          { key: "pay", label: "交50元电费" },
          { key: "skip", label: "暂停本轮，积分保留" },
        ]
      : c.kind === "duel"
        ? [
            { key: "win", label: `${p.name}获胜` },
            { key: "lose", label: "对方获胜" },
          ]
        : c.kind === "bail"
          ? [
              { key: "yes", label: "有人愿意保释" },
              { key: "no", label: "无人保释，扣100" },
            ]
          : c.kind === "optionalMove"
            ? [
                { key: "yes", label: "支付20，前进5格" },
                { key: "no", label: "不使用" },
              ]
            : c.kind === "yesMoney"
              ? [
                  { key: "yes", label: "是" },
                  { key: "no", label: "否" },
                ]
              : null;
  const needsNumber = ["countMoney", "floor", "rpsCount"].includes(c.kind);
  function submit() {
    if (choiceOptions && !choice) {
      setError("请选择现场结果");
      return;
    }
    if (needsNumber && number === "") {
      setError("请填写现场数值");
      return;
    }
    if (
      c.kind === "manual" &&
      !note.trim() &&
      !remind &&
      !Object.values(deltas).some((v) => Number(v) !== 0)
    ) {
      setError("请填写裁定说明；若无变化，可填写“无变化”，或开启待处理提醒。");
      return;
    }
    setError("");
    onResolve({
      target,
      target2,
      choice,
      number: Number(number || 0),
      deltas,
      remind,
      note,
    });
  }
  const shields = s.players.filter((t) =>
    t.effects.some((e) => e.key === "shield"),
  );
  return (
    <div className="drawer-content card-resolution">
      <div className="drawn-for">
        <Token p={p} />
        <span>{p.name} 的烧烧卡</span>
      </div>
      <div className="drawn-card">
        <span className="sao-label">Sao</span>
        <h2>{c.title}</h2>
        <Divider type="dashed-brown" />
        <p>{c.text}</p>
      </div>
      {c.kind === "manual" ? (
        <>
          <div className="help-box">
            <b>这张卡需要现场裁定</b>
            <p>{c.extra}</p>
          </div>
          <p>
            填写本次实际金额变化；系统按原值记账，不再次叠加收入或损失倍率。
          </p>
          {s.players.map((t) => (
            <div className="manual-row" key={t.id}>
              <Token p={t} small />
              <strong style={{color:playerColor(t)}}>{t.name}</strong>
              <Input
                aria-label={`${t.name}卡牌金额变化`}
                type="number"
                value={deltas[t.id] ?? ""}
                placeholder="0"
                onChange={(e) =>
                  setDeltas({ ...deltas, [t.id]: e.target.value })
                }
              />
            </div>
          ))}
          <Input
            aria-label="卡牌裁定说明"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="裁定说明 / 指定玩家 / 待处理事项"
          />
          <div className="switch-row">
            <span>保留待处理提醒</span>
            <Switch checked={remind} onChange={setRemind} />
          </div>
        </>
      ) : null}
      {choiceOptions && (
        <Field
          label={c.kind === "yesMoney" ? c.extra || "是否满足条件" : "现场结果"}
        >
          <CardSelect options={choiceOptions} value={choice} onChange={setChoice} />
        </Field>
      )}
      {(one || two) && !(c.kind === "bail" && choice === "no") && (
        <Field
          label={c.kind === "duel" ? "猜拳对手（先随机选人）" : "选择玩家"}
        >
          <CardSelect options={two?options.filter(t=>t.key!==target2):options} value={target} onChange={setTarget} />
          {(one || two) && (
            <Button
              size="small"
              onClick={() => setTarget(E.shuffle(others.filter(t=>t.id!==target2))[0]?.id || "")}
            >
              随机选择
            </Button>
          )}
        </Field>
      )}
      {two && (
        <Field label="再选择一位">
          <CardSelect
            options={options.filter((t) => t.key !== target)}
            value={target2}
            onChange={setTarget2}
          /><Button size="small" disabled={options.filter(t=>t.key!==target).length===0} onClick={()=>setTarget2(E.shuffle(options.filter(t=>t.key!==target))[0]?.key||"")}>随机选择</Button>
        </Field>
      )}
      {two && others.length < 2 && (
        <p className="negative">
          这张卡需要至少3位玩家。当前不足时，可由主持人使用下方“特殊裁定”处理。
        </p>
      )}
      {needsNumber && (
        <Field
          label={
            c.kind === "floor"
              ? "实际楼层（8楼以上按8楼算）"
              : c.kind === "countMoney"
                ? "同意的人数（不含自己）"
                : "赢之前，输了多少次？"
          }
        >
          <Input
            aria-label="卡牌现场数值"
            type="number"
            min="0"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </Field>
      )}
      {c.kind === "minuteMoney" && (
        <small>
          时间按10分钟一档向上取整：00～10分＋10，11～20分＋20，依此类推。
        </small>
      )}
      {error && (
        <p className="negative" role="alert">
          {error}
        </p>
      )}
      <Button type="primary" size="large" block onClick={submit}>
        {c.kind === "manual" ? "完成裁定" : "结算"}
      </Button>
      {shields.map((t) => (
        <Button key={t.id} block onClick={() => onCancel(t.id)}>
          使用 {t.name} 的取消卡
        </Button>
      ))}
      <details className="special-ruling">
        <summary>特殊裁定 / 原卡图</summary>
        <p>
          规则有歧义、人数不足或需要例外时，可先保留提醒，再在玩家管理中调整。此操作不会自动执行原卡效果。
        </p>
        <SpecialRuling pending={pending} s={s} onResolve={onResolve} />
        <a href={`./卡牌${c.page}.png`} target="_blank" rel="noreferrer">
          查看原始卡牌图片
        </a>
      </details>
    </div>
  );
}
function SpecialRuling({ onResolve }) {
  const [reason, setReason] = useState("");
  return (
    <div className="drawer-content">
      <Input
        aria-label="特殊裁定原因"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="填写处理方式或待办事项"
      />
      <Button
        disabled={!reason.trim()}
        onClick={() =>
          onResolve({ override: true, note: reason, remind: true, deltas: {} })
        }
      >
        按此裁定，保留待处理提醒
      </Button>
    </div>
  );
}
function Rules({ s }) {
  return (
    <div className="drawer-content rules">
      <h3>一轮旅行怎么开始</h3>
      <ol>
        <li>添加玩家，每轮开始先随机排序。</li>
        <li>轮到玩家时输入本轮新增积分，余分自动累计；用完次数后再换人。</li>
        <li>每轮开始前可切换6、12、24面骰，每次消耗 {s.rules.cost} 分；不足一次的余分留到下一轮。</li>
        <li>所有次数用完后结算，保存排名和位置；下一轮从当前位置继续。重来当前轮会恢复轮初状态并重新排序。</li>
      </ol>
      <h3>地图与资金</h3>
      <p>
        从黄色起点向左出发。普通金额格只在停留时奖励；向前经过或恰好停在起点获得{" "}
        {s.rules.passBonus}{" "}
        元，只计一次。初次登岛不发起点奖励。后退不发经过起点奖励。
      </p>
      <p>初始资金默认0元；允许负资金，金额保留两位小数。积分和资金相互独立。</p>
      <h3>烧烧卡结算约定</h3>
      <ul>
        <li>
          抽到时立刻结算，最富／最穷按结算前金额确定。并列时随机；目标可包含自己，自我转账不产生变化。
        </li>
        <li>
          “第二富有”按玩家排序第二位，资金并列随机排序。“前五名”同样先确定名单。
        </li>
        <li>“上一位／下一位”按本轮最初随机顺序，首尾相接。</li>
        <li>
          “失去一次行动”扣一次掷骰积分、不移动；“暂停一回合”立即结束本轮行动，所有积分保留到下一轮。
        </li>
        <li>
          AI：本轮下一次掷骰及连带卡牌收入减半，轮末失效。PPT：接下来两次掷骰及连带卡牌的每笔收入＋20，可跨轮。
        </li>
        <li>
          外部收入包括格子与奖金，参与倍率与持续状态；玩家间转账原额转移；AI和PPT在生效行动中也影响收到的转账，付款额不变。多个倍率相乘；跳过收入优先。
        </li>
        <li>
          “上次收入翻倍”补发与上次收入相同的金额；“误删工资条”扣回本轮已获得的收入，之后收入照常，不追溯收款方。
        </li>
        <li>
          有奖励的移动会触发落点烧烧卡；“后退6格不获取金钱”和“回起点不领奖”不触发落点事件。
        </li>
        <li>
          呱呱乐按10分钟向上分档（00～10分＋10，11～20分＋20）；创业卡在整点分钟小于30时加100，否则减100。采用主持人设备时间。
        </li>
        <li>
          抽完80张才重新洗牌。转赠卡、连抽卡依次排队处理，全部处理完才能下一位。
        </li>
      </ul>
      <h3>特殊效果与轮末结算</h3>
      <p>
        “最近”按环形地图最短距离，同格为最近，并列随机。绑定／资助只复制目标下一次投掷及连带卡牌的全部金钱变化，不再次触发绑定链。皇帝代扣下一笔扣款。买卡支付30给系统，转移下一位其他玩家抽到的卡。
      </p>
      <p>
        交换卡轮末按双方本轮投掷净收支结算（含扣款）；多张交换卡均以结算前净收支计算差额。单脚站立、笑出声、说话次数在轮末由主持人录入，结算后保存最终排名。误操作可撤销最近20步。
      </p>
      <h3>存档</h3>
      <p>
        自动保存包含当前位置、资金、积分、行动顺序、牌堆、未结算卡和状态。浏览器数据不会自动跨设备同步，换电脑请导出并导入存档。
      </p>
    </div>
  );
}


function CardSelect({options,value,onChange}){return <select className="card-select" value={value} onChange={e=>onChange(e.target.value)}><option value="" disabled>请选择</option>{options.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select>;}
function CardDialog({open,onClose,children}){const ref=useRef(null);useEffect(()=>{if(open&&!ref.current.open)ref.current.showModal();if(!open&&ref.current.open)ref.current.close();},[open]);return <dialog ref={ref} className="burn-dialog" aria-label="烧烧卡" onCancel={e=>{e.preventDefault();onClose();}}><header><h2>烧烧卡</h2><button onClick={onClose} aria-label="关闭烧烧卡">×</button></header>{open&&children}</dialog>;}
