/**
 * Deliveries — Attendant Deliveries page
 * Extracted from App.jsx.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken, getToken, clearToken } from '../../../api'
import { toast } from '../../../toast';
import { storage, chatStore, msgStore, notifStore, adminLog, adminChatLog,
         broadcastSlashMessage, attNotifStore } from '../../../storage';
import { fmt, delay, fromNow } from '../../../data';
import { Badge, Btn, Card } from '../../../components/ui';
import { BottomNav } from '../../../components/layout/BottomNav';

export function Deliveries() {
  const nav = useNavigate();
  const att = storage.load('session', {});
  const hubId = att?.hubId;

  // Load deliveries for this hub — reads from slashit_attendant_deliveries (auto-created when slash fills)
  // merged with legacy slashit_attendant_deliveries key
  const getAll = () => {
    const hubId = storage.load('session', {})?.hubId || '';
    // Primary source: slashit_attendant_deliveries (written by user app on slash fill)
    let all = [];
    try {
      const raw = localStorage.getItem('slashit_attendant_deliveries');
      if (raw) all = JSON.parse(raw);
    } catch(e) {}
    // Fallback merge with storage key (legacy)
    const legacy = storage.load('deliveries', []);
    const ids = new Set(all.map(d => d.id));
    legacy.forEach(d => { if (!ids.has(d.id)) all.push(d); });
    return hubId ? all.filter(d => !d.hubId || String(d.hubId) === String(hubId)) : all;
  };

  const [allDeliveries, setAllDeliveries] = useState(getAll);
  const [tab, setTab] = useState('active'); // 'active' | 'history'
  const [reporting, setReporting] = useState(null);
  const [reportNote, setReportNote] = useState('');
  const [notifying, setNotifying] = useState(null);
  const [pickupFrom, setPickupFrom] = useState('10:00 AM');
  const [pickupTo, setPickupTo] = useState('2:00 PM');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setAllDeliveries(getAll()), 3000);
    return () => clearInterval(iv);
  }, []);

  const save = (updated) => {
    setAllDeliveries(updated);
    // Write back to primary key slashit_attendant_deliveries
    try {
      const raw = localStorage.getItem('slashit_attendant_deliveries');
      const existing = raw ? JSON.parse(raw) : [];
      const updatedIds = new Set(updated.map(d => d.id));
      // Merge: updated items + any from existing not in this hub's scope
      const merged = [...updated, ...existing.filter(d => !updatedIds.has(d.id))];
      localStorage.setItem('slashit_attendant_deliveries', JSON.stringify(merged));
    } catch(e) {}
    // Also keep legacy storage key in sync
    storage.save('deliveries', updated);
  };

  // Active: arriving, arrived, verified (delivery done but members still collecting)
  // Completed: status='completed' means all members collected
  const activeDeliveries = allDeliveries.filter(d => d.status !== 'completed');
  const historyDeliveries = allDeliveries.filter(d => d.status === 'completed').sort((a,b)=>new Date(b.completedAt||b.verifiedAt||0)-new Date(a.completedAt||a.verifiedAt||0));

  const markArrived = async (id) => {
    await delay(400);
    save(allDeliveries.map(x=>x.id===id?{...x,status:'arrived',arrivedAt:new Date().toISOString()}:x));
    toast.success('Marked as arrived ✓');
    pushBrowserNotif('📦 Delivery Arrived', allDeliveries.find(d=>d.id===id)?.productName+' has arrived at '+att?.hubName);
  };

  const verify = async (id) => {
    await delay(600);
    const delivery = allDeliveries.find(x=>x.id===id);
    const now = new Date().toISOString();
    save(allDeliveries.map(x=>x.id===id?{...x,status:'verified',verifiedAt:now}:x));
    if (delivery?.slashId) {
      try {
        const userSlashes = JSON.parse(localStorage.getItem('slashit_user_slashes')||'[]');
        const updated = userSlashes.map(s=>String(s.id)===String(delivery.slashId)?{...s,status:'ready_for_pickup',verifiedAt:now}:s);
        localStorage.setItem('slashit_user_slashes', JSON.stringify(updated));
      } catch(e) {}
    }
    toast.success('Delivery verified ✅ — tap "Notify Slashers" to alert members');
  };

  const sendPickupNotification = async (delivery) => {
    if (!pickupFrom||!pickupTo) { toast.error('Set pickup time window'); return; }
    setSending(true);
    await delay(500);
    const cols = JSON.parse(localStorage.getItem('slashit_attendant_collections')||'[]');
    const col = cols.find(c=>String(c.slashId)===String(delivery.slashId));
    if (col) {
      const pending = col.members.filter(m=>m.status==='pending');
      pending.forEach(member => {
        const text = `[SlashIt] Hi ${member.name.split(' ')[0]}, your ${delivery.productName} is ready at ${att?.hubName||col.hubName}! 📦\nCome collect between ${pickupFrom}–${pickupTo} today.\nYour QR: ${member.qrCode} — SlashIt ⚡`;
        msgStore.push(member.userId, {id:`msg-pickup-${Date.now()}-${member.userId}`,type:'pickup_ready',slashId:col.slashId,slashName:col.productName,hubName:att?.hubName||col.hubName,text,sentAt:new Date().toISOString(),isRead:false});
        notifStore.push(member.userId, {id:`notif-pickup-${Date.now()}-${member.userId}`,type:'pickup_ready',title:'📦 Ready for Pickup!',body:`Your ${col.productName} is ready at ${att?.hubName||col.hubName}. Collect ${pickupFrom}–${pickupTo}.`,isRead:false,createdAt:new Date().toISOString(),slashId:col.slashId});
        // Browser push to user
        pushBrowserNotif('📦 Ready for Pickup!', `Your ${col.productName} is ready at ${att?.hubName||col.hubName}. Collect ${pickupFrom}–${pickupTo}.`);
      });
      adminLog.push({id:`log-${Date.now()}`,hubId:att?.hubId||col.hubId,hubName:att?.hubName||col.hubName,attendantId:att?.id,attendantName:att?.name||'Attendant',slashId:col.slashId,slashName:col.productName,type:'pickup_ready',pickupFrom,pickupTo,membersNotified:pending.length,totalMembers:col.members.length,deliveryVerifiedAt:delivery.verifiedAt,sentAt:new Date().toISOString()});
      toast.success(`📨 ${pending.length} member${pending.length!==1?'s':''} notified!`);
    } else {
      toast.error('No collection record found for this slash');
    }
    setSending(false); setNotifying(null);
  };

  const reportIssue = async (id) => {
    if(!reportNote.trim()){toast.error('Describe the issue');return;}
    await delay(400);
    const delivery = allDeliveries.find(x=>x.id===id);
    save(allDeliveries.map(x=>x.id===id?{...x,status:'issue_reported',issueNote:reportNote,reportedAt:new Date().toISOString()}:x));
    try {
      const existing = JSON.parse(localStorage.getItem('slashit_admin_user_disputes')||'[]');
      localStorage.setItem('slashit_admin_user_disputes', JSON.stringify([{id:'att-issue-'+Date.now(),source:'attendant',attendantName:att?.name||'Attendant',hubName:att?.hubName||'',slashId:delivery?.slashId,slashName:delivery?.productName,reason:reportNote.trim(),status:'open',priority:'high',createdAt:new Date().toISOString(),emoji:delivery?.productEmoji||'📦'},...existing]));
    } catch(e) {}
    toast.error('Issue reported to admin ⚠️');
    setReporting(null); setReportNote('');
  };

  const statusMeta = {
    arriving:      {label:'En Route',        bg:'#fef3c7',c:'#d97706'},
    payment_sent:  {label:'💸 Payment Sent',  bg:'#dbeafe',c:'#1d4ed8'},
    arrived:       {label:'Arrived',          bg:'#dbeafe',c:'#1d4ed8'},
    verified:      {label:'Verified ✅',      bg:'#dcfce7',c:'#16a34a'},
    issue_reported:{label:'Issue ⚠️',        bg:'#fee2e2',c:'#dc2626'},
    completed:     {label:'Completed',        bg:'#f0fdf4',c:'#15803d'},
  };

  const renderCard = (d, isHistory=false) => {
    // Check if supplier has been paid for this slash
    const payments = (() => { try{ return JSON.parse(localStorage.getItem('slashit_admin_supplier_payments')||'[]'); }catch(e){return[];} })();
    const isPaid = payments.some(p=>String(p.slashId)===String(d.slashId));
    const slashStatus = (() => { try{ const s=JSON.parse(localStorage.getItem('slashit_user_slashes')||'[]'); return s.find(sl=>String(sl.id)===String(d.slashId))?.status; }catch(e){return null;} })();
    const paymentSent = isPaid || slashStatus==='payment_sent';
    const meta = statusMeta[d.status]||statusMeta.arriving;
    return (
      <Card key={d.id} style={{opacity: isHistory?0.85:1}}>
        <div style={{padding:16}}>
          <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
            <div style={{width:52,height:52,background:'#eff6ff',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{d.productEmoji||'📦'}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'#1e293b'}}>{d.productName}</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{d.quantity} · {d.supplierName}</div>
              <div style={{fontSize:12,color:'#64748b'}}>📞 Leader: {d.leaderName} ({d.leaderPhone})</div>
            </div>
            <Badge label={meta.label} bg={meta.bg} color={meta.c}/>
          </div>
          {paymentSent ? (
            <div style={{background:'#dbeafe',border:'1px solid #93c5fd',borderRadius:10,padding:'8px 12px',marginBottom:10,fontSize:12,fontWeight:700,color:'#1d4ed8'}}>
              💸 Supplier has been paid — delivery expected soon
            </div>
          ) : (
            <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,padding:'8px 12px',marginBottom:10,fontSize:12,fontWeight:600,color:'#92400e'}}>
              ⏳ Awaiting supplier payment from admin before delivery
            </div>
          )}
          <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#64748b',marginBottom:isHistory?0:12}}>
            <div style={{fontWeight:600,color:'#1e293b',marginBottom:4}}>Expected: {d.expectedItems}</div>
            <div>Value: <strong style={{color:'#1d4ed8'}}>{fmt(d.totalValue)}</strong></div>
            {d.scheduledAt&&<div style={{marginTop:2}}>Scheduled: {fmtTime(d.scheduledAt)}</div>}
            {d.arrivedAt&&<div style={{marginTop:2,color:'#1d4ed8'}}>Arrived: {fmtTime(d.arrivedAt)}</div>}
            {d.verifiedAt&&<div style={{marginTop:2,color:'#16a34a',fontWeight:700}}>✓ Verified: {fmtTime(d.verifiedAt)}</div>}
            {d.completedAt&&<div style={{marginTop:2,color:'#15803d',fontWeight:700}}>🎉 Completed: {new Date(d.completedAt).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}</div>}
            {d.issueNote&&<div style={{marginTop:4,color:'#dc2626',fontWeight:600}}>⚠️ Issue: {d.issueNote}</div>}
            {d.memberCount&&<div style={{marginTop:2}}>Members: <strong>{d.collectedCount||0}/{d.memberCount}</strong> collected</div>}
          </div>
          {!isHistory && (
            <>
              {notifying===d.id ? (
                <div style={{marginTop:12,background:'#f0fdf4',borderRadius:12,padding:14,border:'1.5px solid #bbf7d0'}}>
                  <div style={{fontWeight:700,fontSize:13,color:'#15803d',marginBottom:10}}>📨 Set Pickup Time Window</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                    {[['From',pickupFrom,setPickupFrom],['To',pickupTo,setPickupTo]].map(([label,val,setVal])=>(
                      <div key={label}>
                        <div style={{fontSize:11,fontWeight:600,color:'#64748b',marginBottom:4}}>{label}</div>
                        <select value={val} onChange={e=>setVal(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
                          {['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM'].map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:'#475569',marginBottom:10,padding:'8px 10px',background:'#fff',borderRadius:8,border:'1px solid #d1fae5'}}>
                    Preview: "Your {d.productName} is ready! Come collect between {pickupFrom}–{pickupTo} today."
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <Btn size="sm" variant="success" full loading={sending} onClick={()=>sendPickupNotification(d)}>📨 Send to Members</Btn>
                    <Btn size="sm" variant="secondary" onClick={()=>setNotifying(null)}>Cancel</Btn>
                  </div>
                </div>
              ) : reporting===d.id ? (
                <div style={{marginTop:12}}>
                  <textarea value={reportNote} onChange={e=>setReportNote(e.target.value)} rows={2} placeholder="Describe the issue (e.g. short delivery, damaged goods...)" style={{marginBottom:8}}/>
                  <div style={{display:'flex',gap:8}}>
                    <Btn size="sm" variant="danger" full onClick={()=>reportIssue(d.id)}>Submit Report</Btn>
                    <Btn size="sm" variant="secondary" onClick={()=>setReporting(null)}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
                  {d.status==='arriving'&&paymentSent&&<Btn size="sm" variant="primary" full onClick={()=>markArrived(d.id)}>Mark as Arrived</Btn>}
                  {d.status==='arriving'&&!paymentSent&&<div style={{flex:1,textAlign:'center',padding:'9px',background:'#fef3c7',borderRadius:10,fontSize:12,fontWeight:600,color:'#92400e'}}>⏳ Waiting for admin to pay supplier</div>}
                  {d.status==='arrived'&&<Btn size="sm" variant="success" full onClick={()=>verify(d.id)}>✓ Verify & Accept Delivery</Btn>}
                  {d.status==='verified'&&<>
                    <div style={{flex:1,textAlign:'center',padding:'9px',background:'#dcfce7',borderRadius:10,fontSize:12,fontWeight:700,color:'#16a34a'}}>✅ Verified</div>
                    <Btn size="sm" variant="primary" onClick={()=>setNotifying(d.id)}>📨 Notify Slashers</Btn>
                  </>}
                  {d.status==='issue_reported'&&<div style={{flex:1,textAlign:'center',padding:'9px',background:'#fee2e2',borderRadius:10,fontSize:12,fontWeight:700,color:'#dc2626'}}>⚠️ Issue Reported</div>}
                  {d.status!=='verified'&&d.status!=='issue_reported'&&d.status!=='completed'&&<Btn size="sm" variant="danger" onClick={()=>setReporting(d.id)}>Report Issue</Btn>}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    );
  };

  const tabCount = { active: activeDeliveries.length, history: historyDeliveries.length };

  return (
    <div style={{background:'#f0f4ff',minHeight:'100vh'}}>
      <div style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',padding:'52px 16px 0'}}>
        <button onClick={()=>nav(-1)} style={{color:'rgba(255,255,255,.8)',background:'none',fontSize:22,marginBottom:8}}>←</button>
        <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>Deliveries</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.7)',marginBottom:16}}>Incoming orders for {att?.hubName}</div>
        {/* Tabs */}
        <div style={{display:'flex',gap:0}}>
          {[['active','📦 Active'],['history','🕐 History']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:1,padding:'10px 0',fontSize:13,fontWeight:700,color:tab===id?'#fff':'rgba(255,255,255,.6)',background:'none',borderBottom:tab===id?'3px solid #fff':'3px solid transparent',transition:'all .2s'}}>
              {label} <span style={{fontSize:11,background:tab===id?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)',borderRadius:20,padding:'1px 7px',marginLeft:4}}>{tabCount[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
        {tab==='active' && (
          activeDeliveries.length===0
            ? <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📦</div><div style={{fontWeight:700,color:'#475569'}}>No active deliveries</div><div style={{fontSize:12,marginTop:6}}>New deliveries appear here automatically when slashes fill up</div></div>
            : activeDeliveries.map(d=>renderCard(d,false))
        )}
        {tab==='history' && (
          historyDeliveries.length===0
            ? <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🕐</div><div style={{fontWeight:700,color:'#475569'}}>No completed deliveries yet</div><div style={{fontSize:12,marginTop:6}}>Completed deliveries will appear here once all members collect</div></div>
            : historyDeliveries.map(d=>renderCard(d,true))
        )}
      </div>
      <BottomNav/>
    </div>
  );
}

// Re-export alias
export { Deliveries as DeliveriesPage };
