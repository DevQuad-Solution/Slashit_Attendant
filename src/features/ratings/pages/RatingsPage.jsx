/**
 * Ratings — Attendant Ratings page
 * Extracted from App.jsx.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken, getToken, clearToken } from '../../../api'
import { toast } from '../../../toast';
import { storage, chatStore, msgStore, notifStore, adminLog, adminChatLog,
         broadcastSlashMessage, attNotifStore } from '../../../storage';
import { fmt, delay, fromNow } from '../../../data';
import { Card } from '../../../components/ui';
import { BottomNav } from '../../../components/layout/BottomNav';

export function Ratings() {
  const nav = useNavigate();
  const att = storage.load('session', {});
  const [reviews, setReviews] = useState(() => {
    const live = storage.loadUser('hub_reviews', []);
    return att?.hubId ? live.filter(r=>String(r.hubId)===String(att.hubId)) : live;
  });
  useEffect(() => {
    const iv = setInterval(() => {
      const live = storage.loadUser('hub_reviews', []);
      setReviews(att?.hubId ? live.filter(r=>String(r.hubId)===String(att.hubId)) : live);
    }, 3000);
    return () => clearInterval(iv);
  }, []);
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1) : att?.rating||'—';
  const stars = (n) => Array.from({length:5},(_,i)=><span key={i} style={{fontSize:14,filter:i<Math.round(Number(n))?'none':'grayscale(1) opacity(.3)'}}>⭐</span>);
  return (
    <div style={{background:'#f0f4ff',minHeight:'100vh'}}>
      <div style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',padding:'52px 16px 20px'}}>
        <button onClick={()=>nav(-1)} style={{color:'rgba(255,255,255,.8)',background:'none',fontSize:22,marginBottom:8}}>←</button>
        <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>Hub Ratings</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>Member feedback for {att?.hubName}</div>
      </div>
      <div style={{padding:16}}>
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-around',textAlign:'center',padding:'8px 0'}}>
            <div><div style={{fontSize:36,fontWeight:900,color:'#1d4ed8'}}>{avg}</div><div style={{display:'flex',justifyContent:'center',marginBottom:4}}>{stars(avg)}</div><div style={{fontSize:11,color:'#94a3b8'}}>Average</div></div>
            <div style={{width:1,background:'#e2e8f0'}}/>
            <div><div style={{fontSize:36,fontWeight:900,color:'#1e293b'}}>{reviews.length}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:6}}>Reviews</div></div>
            <div style={{width:1,background:'#e2e8f0'}}/>
            <div><div style={{fontSize:36,fontWeight:900,color:'#16a34a'}}>{att?.deliveriesVerified||0}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:6}}>Deliveries</div></div>
          </div>
        </Card>
        <Card style={{padding:16,marginBottom:14}}>
          {[5,4,3,2,1].map(star=>{
            const count = reviews.filter(r=>r.rating===star).length;
            const pct = reviews.length?Math.round(count/reviews.length*100):0;
            return (
              <div key={star} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1e293b',width:14}}>{star}</div>
                <span style={{fontSize:12}}>⭐</span>
                <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:'#f59e0b',borderRadius:4,transition:'width .5s'}}/>
                </div>
                <div style={{fontSize:11,color:'#94a3b8',width:28,textAlign:'right'}}>{count}</div>
              </div>
            );
          })}
        </Card>
        {reviews.length===0 ? (
          <Card style={{padding:32,textAlign:'center'}}><div style={{fontSize:36,marginBottom:10}}>⭐</div><div style={{fontWeight:700,color:'#1e293b'}}>No reviews yet</div></Card>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {reviews.map(r=>(
              <Card key={r.id} style={{padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div><div style={{fontWeight:700,color:'#1e293b',fontSize:13}}>{r.userName||'Member'}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{r.slashName||`Slash #${r.slashId}`}</div></div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>{stars(r.rating)}<span style={{fontSize:12,fontWeight:800,color:'#f59e0b',marginLeft:4}}>{r.rating}/5</span></div>
                </div>
                {r.review&&<div style={{fontSize:12,color:'#475569',lineHeight:1.6,background:'#f8fafc',borderRadius:8,padding:'8px 12px',marginBottom:6}}>"{r.review}"</div>}
                <div style={{fontSize:10,color:'#94a3b8'}}>{r.createdAt?new Date(r.createdAt).toLocaleString('en-NG',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav/>
    </div>
  );
}

// Re-export alias
export { Ratings as RatingsPage };
