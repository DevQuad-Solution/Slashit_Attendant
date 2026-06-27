/**
 * Dashboard — Attendant Dashboard page
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

export function Dashboard() {
  const nav = useNavigate();
  const [att, setAtt] = useState(() => storage.load('session', {}));
  const [onDuty, setOnDuty] = useState(() => storage.load('session', {})?.onDuty ?? true);
  const [toggling, setToggling] = useState(false);
  const [deliveries, setDashDeliveries] = useState([]);
  const [collections, setDashCollections] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);
  // request push permission on mount
  useEffect(() => { if ('Notification' in window && Notification.permission === 'default') { Notification.requestPermission(); } }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.attendant.getDashboard();
      const data = res.data || res;
      const delivList = data.deliveries || data.pendingDeliveries || [];
      const collList  = data.collections || data.pendingCollections || [];
      setDashDeliveries(Array.isArray(delivList) && delivList.length > 0
        ? delivList.map(d=>({...d,id:d._id||d.id}))
        : []);
      setDashCollections(Array.isArray(collList) && collList.length > 0
        ? collList.map(c=>({...c,id:c._id||c.id}))
        : []);
    } catch(e) {
      toast.error('Failed to load dashboard data. Check your connection.');
      setDashDeliveries([]);
      setDashCollections([]);
    } finally {
      setLoadingDash(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const iv = setInterval(fetchDashboard, 30000);
    return () => clearInterval(iv);
  }, []);

  const toggleDuty = async () => {
    setToggling(true); await delay(500);
    const next = !onDuty; setOnDuty(next);
    const sess = storage.load('session', null);
    if (sess) { storage.save('session', { ...sess, onDuty: next }); }
    toast.success(next?'✅ You are now On Duty':'🔴 You are now Off Duty');
    setToggling(false);
  };

  const activeDeliveries = deliveries.filter(d=>d.status==='arriving'||d.status==='arrived').length;
  const readyPickups = collections.filter(c=>c.status==='ready'||c.status==='ready_for_pickup').length;
  const pendingCollect = collections.reduce((s,c)=>s+(c.members?.filter(m=>m.status==='pending').length||0),0);
  const completedToday = collections.filter(c=>c.members?.every(m=>m.status==='collected')).length;

  const STATS = [
    {icon:'🚛',label:'Active Deliveries',value:activeDeliveries,bg:'#fef3c7',vc:'#d97706'},
    {icon:'📦',label:'Ready for Pickup',value:readyPickups,bg:'#eff6ff',vc:'#1d4ed8'},
    {icon:'⏳',label:'Pending Members',value:pendingCollect,bg:'#fdf4ff',vc:'#7c3aed'},
    {icon:'✅',label:'Completed Today',value:completedToday,bg:'#f0fdf4',vc:'#16a34a'},
  ];

  const schedule = (()=>{
    const items = [];
    deliveries.forEach(d => {
      const st = d.status==='verified'?'done':d.status==='arrived'?'now':'upcoming';
      items.push({time:d.scheduledAt?fmtTime(d.scheduledAt):'—',type:'delivery',label:(d.productEmoji||'📦')+' '+d.productName,sub:'From '+d.supplierName,status:st,deliveryId:d.id});
    });
    collections.forEach(c => {
      const collected = c.members?.filter(m=>m.status==='collected').length||0;
      const total = c.members?.length||c.totalSlots||0;
      const st = collected>=total?'done':c.status==='ready'||c.status==='ready_for_pickup'?'now':'upcoming';
      items.push({time:'—',type:'pickup_window',label:(c.productEmoji||'✅')+' '+(c.productName||'Pickup'),sub:`${collected}/${total} members collected`,status:st,slashId:c.slashId});
    });
    return items;
  })();

  const quickActions = [
    {icon:'📦',label:'Deliveries',sub:'Track incoming orders',bg:'#eff6ff',path:'/deliveries'},
    {icon:'📷',label:'Scan QR',sub:'Confirm member pickup',bg:'#fef3c7',path:'/scanner'},
    {icon:'✅',label:'Collections',sub:'Member pickup list',bg:'#f0fdf4',path:'/collections'},
    {icon:'⭐',label:'Ratings',sub:'Hub feedback',bg:'#fdf4ff',path:'/ratings'},
  ];

  return (
    <div style={{background:'#f0f4ff',minHeight:'100vh'}}>
      <div style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',padding:'52px 16px 24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,.06)'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{width:40,height:40,borderRadius:12,overflow:'hidden',background:'#fff',flexShrink:0}}>
              <img src="/logo.jpg" alt="SlashIt" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>Hub Attendant</div>
              <div style={{fontSize:17,fontWeight:800,color:'#fff'}}>{att?.name} 👋</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:1}}>📍 {att?.hubName}, {att?.state}</div>
            </div>
          </div>
          <button disabled={toggling} onClick={toggleDuty}
            style={{padding:'8px 14px',borderRadius:12,fontSize:12,fontWeight:700,background:onDuty?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)',color:onDuty?'#4ade80':'#f87171',border:`1.5px solid ${onDuty?'rgba(74,222,128,.4)':'rgba(248,113,113,.4)'}`}}>
            {onDuty?'● On Duty':'○ Off Duty'}
          </button>
        </div>
        {(()=>{
          const liveReviews = storage.loadUser('hub_reviews', []);
          const hubReviews = att?.hubId ? liveReviews.filter(r=>String(r.hubId)===String(att.hubId)) : liveReviews;
          const liveAvg = hubReviews.length ? (hubReviews.reduce((s,r)=>s+(r.rating||0),0)/hubReviews.length).toFixed(1) : (att?.rating||'—');
          const liveCount = hubReviews.length || att?.totalRatings || 0;
          return (
            <div style={{background:'rgba(255,255,255,.12)',borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,border:'1px solid rgba(255,255,255,.2)'}}>
              <span style={{fontSize:22}}>⭐</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:'#fff',fontSize:15}}>{liveAvg} Hub Rating</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.6)'}}>Based on {liveCount} member rating{liveCount!==1?'s':''}</div>
              </div>
              <button onClick={()=>nav('/ratings')} style={{color:'rgba(255,255,255,.7)',background:'none',fontSize:13,fontWeight:700}}>View →</button>
            </div>
          );
        })()}
      </div>
      <div style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {STATS.map(s=>(
            <Card key={s.label} style={{padding:14}}>
              <div style={{width:40,height:40,background:s.bg,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:8}}>{s.icon}</div>
              <div style={{fontSize:24,fontWeight:900,color:s.vc}}>{s.value}</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{s.label}</div>
            </Card>
          ))}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Today's Schedule</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          {schedule.map((item,i)=>{
            const colors = {now:{border:'#2563eb',bg:'#eff6ff'},upcoming:{border:'#e2e8f0',bg:'#fff'},done:{border:'#e2e8f0',bg:'#f8fafc'}};
            const c = colors[item.status]||colors.upcoming;
            return (
              <Card key={i} onClick={()=>item.deliveryId&&nav('/deliveries')} style={{padding:14,border:`2px solid ${c.border}`,background:c.bg,cursor:item.deliveryId?'pointer':'default'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:'#64748b'}}>{item.time}</div>
                    <div style={{fontSize:18,marginTop:2}}>{item.type==='delivery'?'📦':'✅'}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:'#1e293b',fontSize:13}}>{item.label}</div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{item.sub}</div>
                  </div>
                  {item.status==='now'&&<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'#2563eb',color:'#fff'}}>NOW</span>}
                  {item.status==='done'&&<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'#f1f5f9',color:'#94a3b8'}}>DONE</span>}
                </div>
              </Card>
            );
          })}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {quickActions.map(a=>(
            <Card key={a.path} onClick={()=>nav(a.path)} style={{padding:14,cursor:'pointer'}} className="active-scale">
              <div style={{width:40,height:40,background:a.bg,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:8}}>{a.icon}</div>
              <div style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>{a.label}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{a.sub}</div>
            </Card>
          ))}
        </div>
        <button onClick={()=>{ storage.remove('session'); window.location.href='/'; }}
          style={{width:'100%',padding:'13px',borderRadius:14,border:'2px solid #fee2e2',color:'#dc2626',fontWeight:700,fontSize:14,background:'#fff',marginBottom:16}}>
          Sign Out
        </button>
      </div>
      <BottomNav/>
    </div>
  );
}

// Re-export alias
export { Dashboard as DashboardPage };
