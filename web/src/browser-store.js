import {SAVE_KEY,readGame,writeGame,unreadableGame,packSave} from './save-store.js';
let db,raw=null,backend='localStorage';
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('life-island-save'):null;
export function watchStore(fn){if(!channel)return()=>{};channel.onmessage=()=>fn();return()=>{channel.onmessage=null;};}
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('life-island-games',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('请关闭旧游戏窗口后重试'));});}
function read(){return new Promise((resolve,reject)=>{const t=db.transaction('saves','readonly'),r=t.objectStore('saves').get('current');r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);});}
function put(value,expected){return new Promise((resolve,reject)=>{const t=db.transaction('saves','readwrite'),s=t.objectStore('saves'),r=s.get('current');let conflict;
 r.onsuccess=()=>{if((r.result??null)!==expected){conflict=Object.assign(Error('另一窗口已更新存档，请先导出当前进度。'),{name:'SaveConflictError'});t.abort();return;}s.put(value,'current');};t.oncomplete=()=>resolve();t.onabort=t.onerror=()=>reject(conflict||t.error||Error('本地保存失败'));});}
export async function bootStore(){
 try{db=await open();raw=await read();backend='IndexedDB';
  if(raw===null){const legacy=localStorage.getItem(SAVE_KEY);if(legacy){const old=readGame(localStorage);if(old.readFailed)return old;await put(legacy,null);if(await read()!==legacy)throw Error('迁移校验失败');raw=legacy;/* Keep the old bytes as a recovery backup until a successful new save. */}}
  return {...readGame({getItem:()=>raw}),backend};
 }catch(error){if(db)return {...unreadableGame(raw),error:"本地数据库读取或迁移失败，原数据未改动。请保留备份后重试。"};db=null;backend='localStorage';try{return {...readGame(localStorage),backend,warning:'本地数据库暂不可用，使用兼容存储；请定期导出备份。'};}catch{return unreadableGame();}}
}
export async function saveBrowser(next,expected){
 const savedAt=new Date().toISOString();
 if(!db)return {...writeGame(localStorage,{...next,savedAt},expected),backend,savedAt};
 const envelope={state:next.state,history:next.history.slice(-20),rev:next.rev,savedAt};
 const value=packSave(envelope);await put(value,expected);raw=value;
 // The new transactional save is authoritative. Remove only this game's legacy backup after success.
 try{localStorage.removeItem(SAVE_KEY);}catch{}
 channel?.postMessage({rev:next.rev});
 navigator.storage?.persist?.().catch(()=>{});
 return {...envelope,storedRaw:value,backend};
}
