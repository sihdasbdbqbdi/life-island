import React from 'react';
export default function RankMedal({rank}) {
 if(rank>3)return <span className="rank-num">{rank}</span>;
 const colors=['#ffcc4a','#cbd5df','#cf9564'];
 return <svg className="rank-medal" width="28" height="32" viewBox="0 0 28 32" role="img" aria-label={['金牌','银牌','铜牌'][rank-1]}><path d="M7 3h6l1 10-6 1zM15 3h6l-1 11-6-1z" fill="#64748b" stroke="#0a0b0e" strokeWidth="2" strokeLinejoin="round"/><circle cx="14" cy="21" r="9" fill={colors[rank-1]} stroke="#0a0b0e" strokeWidth="2.5"/><path d="m14 15 1.7 3.5 3.8.6-2.7 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.7-2.7 3.8-.6z" fill="#0a0b0e" opacity=".75"/></svg>;
}
