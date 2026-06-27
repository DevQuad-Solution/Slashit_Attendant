/**
 * Scanner — Attendant Scanner page
 * Extracted from App.jsx.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken, getToken, clearToken } from '../../../api'
import { toast } from '../../../toast';
import { storage, chatStore, msgStore, notifStore, adminLog, adminChatLog,
         broadcastSlashMessage, attNotifStore } from '../../../storage';
import { fmt, delay, fromNow } from '../../../data';
import { Btn, Card } from '../../../components/ui';
import { BottomNav } from '../../../components/layout/BottomNav';

export function Scanner() {
  const nav = useNavigate();
  const att = storage.load('session', {});
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    // Load collections from dashboard data for demo QR hints
    const local = storage.load('collections', []);
    setCollections(att?.hubId ? local.filter(c=>!c.hubId||String(c.hubId)===String(att.hubId)) : local);
  }, []);

  const scan = async (qr=code) => {
    if(!qr.trim()){toast.error('Enter or scan a QR code');return;}
    setScanning(true);
    try {
      // Call real API to verify QR
      const res = await api.slashes.verifyQR(qr.trim());
      const data = res.data || res;
      setResult({
        success: true,
        member: data.member || data.user || { name: data.userName||'Member', userId: data.userId },
        collection: data.slash || data.collection || { slashId: data.slashId, productName: data.productName||'Order' },
        apiVerified: true,
      });
    } catch(err) {
      // Fallback to local scan if API fails
      const fresh = storage.load('collections', []);
      const allCols = att?.hubId ? fresh.filter(c=>!c.hubId||String(c.hubId)===String(att.hubId)) : fresh;
      let found=null, collection=null;
      for(const col of allCols){
        const m = col.members.find(m=>m.qrCode===qr.trim());
        if(m){found=m;collection=col;break;}
      }
      if(!found) setResult({success:false, message:`QR code not found. ${err.message||''}`});
      else if(found.status==='collected') setResult({success:false, message:`${found.name} already collected ✓`});
      else setResult({success:true, member:found, collection});
    } finally {
      setScanning(false);
    }
  };

  const confirm = async () => {
    if(!result?.success) return;
    try {
      // Update local collections state
      const fresh = storage.load('collections', []);
      const updated = fresh.map(c=>{
        if(c.slashId!==result.collection?.slashId) return c;
        const members = c.members.map(m=>m.userId===result.member?.userId?{...m,status:'collected',collectedAt:new Date().toISOString()}:m);
        return {...c,members,collectedCount:members.filter(m=>m.status==='collected').length};
      });
      storage.save('collections', updated);
      setCollections(updated);
      toast.success('✅ ' + (result.member?.name||'Member') + ' marked as collected!');
    } catch(e) {
      toast.error('Could not confirm collection');
    }
    setResult(null); setCode('');
  };

  const pendingQRs = collections.flatMap(c=>(c.members||[]).filter(m=>m.status==='pending').map(m=>m.qrCode)).slice(0,6);

  return (
    <div style={{background:'#f0f4ff',minHeight:'100vh'}}>
      <div style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',padding:'52px 16px 20px'}}>
        <button onClick={()=>nav(-1)} style={{color:'rgba(255,255,255,.8)',background:'none',fontSize:22,marginBottom:8}}>←</button>
        <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>QR Scanner</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>Scan member QR codes to mark collection</div>
      </div>
      <div style={{padding:16}}>
        <Card style={{padding:0,overflow:'hidden',marginBottom:14}}>
          <div style={{background:'#0f172a',height:220,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,position:'relative'}}>
            <div style={{width:160,height:160,border:'2px solid #2563eb',borderRadius:16,position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {[[0,0,'4px 0 0 0'],[0,'auto','0 4px 0 0'],['auto',0,'0 0 0 4px'],['auto','auto','0 0 4px 0']].map(([t,r,br],i)=>(
                <div key={i} style={{position:'absolute',top:t===0?-2:undefined,bottom:t==='auto'?-2:undefined,left:r==='auto'?undefined:-2,right:r===0?undefined:r==='auto'?-2:undefined,width:16,height:16,border:'3px solid #3b82f6',borderRadius:br}}/>
              ))}
              <div style={{color:'#475569',fontSize:12,textAlign:'center'}}>📷<br/>Camera<br/>Preview</div>
            </div>
            <div style={{fontSize:11,color:'#64748b'}}>Point camera at member QR code</div>
          </div>
        </Card>
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',marginBottom:10}}>Or enter QR code manually</div>
          <div style={{display:'flex',gap:8}}>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. QR-1048-06" onKeyDown={e=>e.key==='Enter'&&scan()} style={{flex:1}}/>
            <Btn loading={scanning} onClick={()=>scan()}>Scan</Btn>
          </div>
        </Card>
        {pendingQRs.length > 0 && (
          <Card style={{padding:14,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',marginBottom:8}}>⏳ Pending — Tap to scan</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {pendingQRs.map(q=>(
                <button key={q} onClick={()=>{setCode(q);scan(q);}} style={{padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:700,background:'#eff6ff',color:'#1d4ed8',border:'1.5px solid #bfdbfe'}}>{q}</button>
              ))}
            </div>
          </Card>
        )}
        {result&&(
          <Card style={{padding:16,border:`2px solid ${result.success?'#bfdbfe':'#fecaca'}`}}>
            {result.success ? (
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#1d4ed8',marginBottom:10}}>✓ Member found!</div>
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
                  <div style={{width:48,height:48,background:'#eff6ff',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{result?.collection?.productEmoji || '📦'}</div>
                  <div>
                    <div style={{fontWeight:700,color:'#1e293b',fontSize:14}}>{result?.member?.name || 'Member'}</div>
                    <div style={{fontSize:12,color:'#64748b'}}>{result?.collection?.productName || 'Product'} — Slot #{result?.member?.slotNumber || '?'}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{result?.member?.phone || ''}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn full variant="success" onClick={confirm}>✅ Confirm Collection</Btn>
                  <Btn variant="secondary" onClick={()=>{setResult(null);setCode('');}}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#dc2626',marginBottom:6}}>⚠️ {result.message}</div>
                <Btn size="sm" variant="secondary" onClick={()=>{setResult(null);setCode('');}}>Try Again</Btn>
              </div>
            )}
          </Card>
        )}
      </div>
      <BottomNav/>
    </div>
  );
}

// Re-export alias
export { Scanner as ScannerPage };
