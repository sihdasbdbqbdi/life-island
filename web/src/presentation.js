export const PLAYER_COLORS = {
 teal:'#64d8c5',orange:'#ffab69',purple:'#c39af7',pink:'#ff95c2',blue:'#89b5ff',green:'#99d97c',yellow:'#ffe078',red:'#ff8982',lime:'#c9df75',peach:'#efb79a',brown:'#c79f8c',navy:'#819fdf',rose:'#e68fa3',olive:'#c1c58a',cyan:'#65cced',violet:'#aa9bff',ochre:'#d5b86a',slate:'#9bb9c9',forest:'#75b69b',magenta:'#d78bd4'
};
export const playerColor=p=>PLAYER_COLORS[p?.color]||PLAYER_COLORS.teal;
const readable=text=>text.replace(/( · \d+) 点/g,"$1 步").replace(/([+\-−]\d+(?:\.\d+)?)(?![\d.$])/g,(match,_,offset,all)=>/^\s*(?:分|积分|次|步|格)/.test(all.slice(offset+match.length))?match:match+"$");
export function activityEntries(log) {
  const result=[];
  for(let i=0;i<log.length;i++) {
    const l=log[i];
    if(l.detail) continue;
    // 旧存档也以一条摘要显示一次掷骰，不修改原始账本。
    const old=l.text.match(/^(.+) ([+-][\d.]+) 元 · 落点奖励$/);
    if(old) {
      const roll=log.slice(i+1,i+5).find(x=>x.text.startsWith(old[1]+' 消耗 ')&&x.text.includes('掷出'));
      const die=roll?.text.match(/掷出 (\d+) 点/);
      result.push({...l,text:die?`${old[1]} · ${die[1]} 点 · ${old[2]}`:`${old[1]} ${old[2]}`});
      continue;
    }
    if(/消耗 \d+ 积分，掷出|到达 第\d+格|到达 起点|结算完成/.test(l.text))continue;
    result.push(l);
  }
  return result.map(l=>({...l,text:readable(l.text)}));
}
