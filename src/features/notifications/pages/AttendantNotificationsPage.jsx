/**
 * AttendantNotifications — Attendant AttendantNotifications page
 * Extracted from App.jsx.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken, getToken, clearToken } from '../../../api'
import { toast } from '../../../toast';
import { storage, chatStore, msgStore, notifStore, adminLog, adminChatLog,
         broadcastSlashMessage, attNotifStore } from '../../../storage';
import { fmt, delay, fromNow } from '../../../data';
import { BottomNav } from '../../../components/layout/BottomNav';

export function AttendantNotifications() {
  const nav = useNavigate();
  const att = storage.load('session', {});
  const attId = att?.id||'';
  const [notifs, setNotifs] = useState(()=>attNotifStore.load(attId));
  useEffect(()=>{
    const iv = setInterval(()=>setNotifs(attNotifStore.load(attId)),3000);
    return ()=>clearInterval(iv);
  },[attId]);
  const markAll = ()=>{attNotifStore.markAllRead(attId);setNotifs(attNotifStore.load(attId));};
  const unread = notifs.filter(n=>!n.isRead).length;
  const typeIcon={user_message:'💬',chat_sent:'✓',pickup_ready:'📨',completed:'🎉',dissolved:'↩️',new_delivery:'🚛'};
  const typeBg={user_message:'#eff6ff',chat_sent:'#f0fdf4',pickup_ready:'#fef3c7',completed:'#fdf4ff',dissolved:'#fff7ed',new_delivery:'#fefce8'};
  const typeBdr={user_message:'#bfdbfe',chat_sent:'#bbf7d0',pickup_ready:'#fde68a',completed:'#e9d5ff',dissolved:'#fed7aa',new_delivery:'#fef08a'};
  return (
    <div style={{background:'#f0f4ff',minHeight:'100vh'}}>
      <div style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',padding:'52px 16px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <button onClick={()=>nav(-1)} style={{color:'rgba(255,255,255,.8)',background:'none',fontSize:22,marginBottom:8,display:'block'}}>←</button>
            <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>Notifications {unread>0&&<span style={{background:'#dc2626',color:'#fff',fontSize:12,borderRadius:20,padding:'2px 8px',marginLeft:8}}>{unread}</span>}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>Alerts for {att?.hubName}</div>
          </div>
          {unread>0&&<button onClick={markAll} style={{background:'rgba(255,255,255,.2)',color:'#fff',borderRadius:20,padding:'8px 16px',fontSize:12,fontWeight:700,marginTop:32}}>Mark all read</button>}
        </div>
      </div>
      <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
        {notifs.length===0 ? (
          <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🔔</div><div style={{fontWeight:700,color:'#475569',fontSize:14}}>No notifications yet</div><div style={{fontSize:12,marginTop:6}}>Member messages and delivery alerts will appear here</div></div>
        ) : notifs.map((n,i)=>(
          <div key={n.id||i} style={{background:typeBg[n.type]||'#fff',border:`1.5px solid ${n.isRead?'#e2e8f0':(typeBdr[n.type]||'#bfdbfe')}`,borderRadius:14,padding:'14px 16px',position:'relative',opacity:n.isRead?0.8:1}}>
            {!n.isRead&&<div style={{position:'absolute',top:14,right:14,width:8,height:8,background:'#2563eb',borderRadius:'50%'}}/>}
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <div style={{fontSize:22,flexShrink:0}}>{typeIcon[n.type]||'🔔'}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:'#1e293b',marginBottom:2}}>{n.title}</div>
                <div style={{fontSize:12,color:'#475569',lineHeight:1.6}}>{n.body}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginTop:6}}>
                  {n.createdAt?new Date(n.createdAt).toLocaleString('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}
                  {n.type==='user_message'&&<button onClick={()=>nav('/chats')} style={{marginLeft:10,color:'#2563eb',fontWeight:700,fontSize:10,background:'none',border:'none',cursor:'pointer'}}>Open Chat →</button>}
                  {n.type==='new_delivery'&&<button onClick={()=>nav('/deliveries')} style={{marginLeft:10,color:'#d97706',fontWeight:700,fontSize:10,background:'none',border:'none',cursor:'pointer'}}>View Deliveries →</button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav/>
    </div>
  );
}

// Re-export alias
export { AttendantNotifications as AttendantNotificationsPage };
