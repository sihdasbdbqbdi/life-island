import * as E from './engine.js';
export const SAVE_KEY='life-island-save-v1';
export function unreadableGame(raw=null){return {state:E.fresh(),history:[],rev:0,storedRaw:raw,readFailed:true,error:'原存档无法读取，原数据未改动。请先下载原始备份，再从有效文件恢复；恢复前暂停游戏操作。'};}
export function readGame(storage){
 let raw=null;
 try{raw=storage.getItem(SAVE_KEY);if(!raw)return {state:E.fresh(),history:[],rev:0,storedRaw:null};
  const data=JSON.parse(raw),state=E.validateSave(data),history=[];let skipped=0;
  for(const h of (Array.isArray(data.history)?data.history:[]).slice(-20)){try{history.push(E.validateSave(h));}catch{skipped++;}}
  return {state,history,rev:Number.isSafeInteger(data.rev)?data.rev:0,storedRaw:raw,warning:skipped?'当前进度已恢复；部分损坏的撤销记录已跳过，原始数据仍可导出。':undefined};
 }catch{return unreadableGame(raw);}
}
// setItem is atomic: failed writes never remove or clear the previous valid save.
export function writeGame(storage,next,expectedRaw){
 const current=storage.getItem(SAVE_KEY);
 if(current!==expectedRaw){const e=new Error('另一窗口已更新存档，已停止写入，避免覆盖。请先导出当前进度。');e.name='SaveConflictError';throw e;}
 const history=next.history.slice(-20);let lastError;
 for(let keep=history.length;keep>=0;keep--){
  const envelope={state:next.state,history:keep?history.slice(-keep):[],rev:next.rev};
  const raw=JSON.stringify(envelope);
  try{storage.setItem(SAVE_KEY,raw);return {...envelope,storedRaw:raw,trimmed:keep<history.length};}
  catch(e){lastError=e;if(e.name!=='QuotaExceededError'&&e.code!==22&&e.code!==1014)throw e;}
 }
 throw lastError;
}
