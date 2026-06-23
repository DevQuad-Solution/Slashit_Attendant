export const fmt = (n) => `₦${Number(n).toLocaleString("en-NG")}`;
export const delay = (ms=400) => new Promise(r=>setTimeout(r,ms));
export const fromNow = (iso) => {
  const s=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(s<60)return "just now";
  const m=Math.floor(s/60); if(m<60)return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24)return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"});
export const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-NG",{day:"numeric",month:"short"});

export const MOCK_ATTENDANTS_DB = [
  { id:"att-001", name:"Adebayo Johnson", phone:"08031112200", loginPin:"1234", hubId:"bodija-hub",    hubName:"Bodija Hub",    city:"Ibadan",    state:"Oyo",   rating:4.7, totalRatings:312, deliveriesVerified:87,  onDuty:true  },
  { id:"att-002", name:"Chioma Obi",      phone:"08044223311", loginPin:"5678", hubId:"ui-sub-hub",    hubName:"UI SUB Hub",    city:"Ibadan",    state:"Oyo",   rating:4.5, totalRatings:198, deliveriesVerified:104, onDuty:true  },
  { id:"att-003", name:"Emeka Nwosu",     phone:"08055334422", loginPin:"9012", hubId:"challenge-hub", hubName:"Challenge Hub", city:"Ibadan",    state:"Oyo",   rating:4.2, totalRatings:89,  deliveriesVerified:42,  onDuty:false },
  { id:"att-004", name:"Akin Oladele",    phone:"08066445533", loginPin:"3456", hubId:"lautech-hub",   hubName:"LAUTECH Hub",   city:"Ogbomosho", state:"Oyo",   rating:4.8, totalRatings:156, deliveriesVerified:63,  onDuty:true  },
  { id:"att-005", name:"Tunde Adeyemi",   phone:"08077556644", loginPin:"7890", hubId:"yaba-hub",      hubName:"Yaba Hub",      city:"Yaba",      state:"Lagos", rating:4.4, totalRatings:241, deliveriesVerified:132, onDuty:true  },
  { id:"att-006", name:"Ngozi Eze",       phone:"08088667755", loginPin:"2468", hubId:"unilag-hub",    hubName:"UNILAG Hub",    city:"Yaba",      state:"Lagos", rating:4.6, totalRatings:320, deliveriesVerified:189, onDuty:true  },
];

export let MOCK_DELIVERIES = [
  { id:"del-001", slashId:1048, productEmoji:"🥚", productName:"Crate of Eggs x4",  quantity:"4 crates",  leaderName:"Emeka O.",    leaderPhone:"08023456789", supplierName:"Olaiya Farms Ltd", totalValue:22400, expectedItems:"4 crates x 30 eggs each",      status:"arriving", scheduledAt:new Date(Date.now()+3600000).toISOString(), memberCount:8, collectedCount:5 },
  { id:"del-002", slashId:1047, productEmoji:"🌾", productName:"50kg Bag of Rice",   quantity:"1 bag",     leaderName:"Chukwudi A.", leaderPhone:"08031234567", supplierName:"Konga Wholesale",  totalValue:72000, expectedItems:"1 x 50kg bag, sealed",          status:"arrived",  scheduledAt:new Date(Date.now()-1800000).toISOString(), arrivedAt:new Date(Date.now()-1200000).toISOString(), memberCount:6, collectedCount:2 },
  { id:"del-003", slashId:1046, productEmoji:"🧼", productName:"Detergent Bulk x12", quantity:"12 packs",  leaderName:"Kemi R.",     leaderPhone:"08077654321", supplierName:"Konga Wholesale",  totalValue:15600, expectedItems:"12 x Ariel 3kg packs",          status:"verified", scheduledAt:new Date(Date.now()-86400000).toISOString(), arrivedAt:new Date(Date.now()-82800000).toISOString(), verifiedAt:new Date(Date.now()-79200000).toISOString(), memberCount:6, collectedCount:6 },
  { id:"del-004", slashId:1050, productEmoji:"🫙", productName:"Groundnut Oil 25L",  quantity:"5 bottles", leaderName:"Seun L.",     leaderPhone:"08099876543", supplierName:"Agro Direct NG",   totalValue:45000, expectedItems:"5 x 5L bottles groundnut oil", status:"arriving", scheduledAt:new Date(Date.now()+7200000).toISOString(), memberCount:5, collectedCount:0 },
];

export let MOCK_COLLECTIONS = [
  {
    slashId:1048, productEmoji:"🥚", productName:"Crate of Eggs x4",
    totalSlots:8, collectedCount:5, status:"ready_for_pickup", deliveryId:"del-001",
    members:[
      {userId:"u1",name:"Olanrewaju T.",phone:"08043289704",slotNumber:1,qrCode:"QR-1048-01",status:"collected",collectedAt:new Date(Date.now()-7200000).toISOString()},
      {userId:"u2",name:"Chukwudi A.",  phone:"08031234567",slotNumber:2,qrCode:"QR-1048-02",status:"collected",collectedAt:new Date(Date.now()-5400000).toISOString()},
      {userId:"u3",name:"Fatima K.",    phone:"08056789012",slotNumber:3,qrCode:"QR-1048-03",status:"collected",collectedAt:new Date(Date.now()-3600000).toISOString()},
      {userId:"u4",name:"Emeka O.",     phone:"08023456789",slotNumber:4,qrCode:"QR-1048-04",status:"collected",collectedAt:new Date(Date.now()-1800000).toISOString()},
      {userId:"u5",name:"Seun L.",      phone:"08099876543",slotNumber:5,qrCode:"QR-1048-05",status:"collected",collectedAt:new Date(Date.now()-900000).toISOString()},
      {userId:"u6",name:"Kemi R.",      phone:"08077654321",slotNumber:6,qrCode:"QR-1048-06",status:"pending"},
      {userId:"u7",name:"Tunde B.",     phone:"08011122334",slotNumber:7,qrCode:"QR-1048-07",status:"pending"},
      {userId:"u8",name:"Grace E.",     phone:"08088776655",slotNumber:8,qrCode:"QR-1048-08",status:"pending"},
    ]
  },
  {
    slashId:1047, productEmoji:"🌾", productName:"50kg Bag of Rice",
    totalSlots:6, collectedCount:2, status:"ready_for_pickup", deliveryId:"del-002",
    members:[
      {userId:"u2",name:"Chukwudi A.",  phone:"08031234567",slotNumber:1,qrCode:"QR-1047-01",status:"collected",collectedAt:new Date(Date.now()-3000000).toISOString()},
      {userId:"u4",name:"Emeka O.",     phone:"08023456789",slotNumber:2,qrCode:"QR-1047-02",status:"collected",collectedAt:new Date(Date.now()-1500000).toISOString()},
      {userId:"u5",name:"Seun L.",      phone:"08099876543",slotNumber:3,qrCode:"QR-1047-03",status:"pending"},
      {userId:"u1",name:"Olanrewaju T.",phone:"08043289704",slotNumber:4,qrCode:"QR-1047-04",status:"pending"},
      {userId:"u6",name:"Kemi R.",      phone:"08077654321",slotNumber:5,qrCode:"QR-1047-05",status:"pending"},
      {userId:"u8",name:"Grace E.",     phone:"08088776655",slotNumber:6,qrCode:"QR-1047-06",status:"pending"},
    ]
  },
];

export const MOCK_SCHEDULE = [
  {time:"10:00", type:"delivery",      label:"Crate of Eggs x4 expected",    sub:"From Olaiya Farms — Slash #1048",     status:"now",      deliveryId:"del-001"},
  {time:"12:00", type:"pickup_window", label:"Member pickup window",           sub:"Members collecting from Slash #1047", status:"upcoming", slashId:1047},
  {time:"15:00", type:"delivery",      label:"Groundnut Oil 25L",              sub:"From Agro Direct NG — Slash #1050",  status:"upcoming", deliveryId:"del-004"},
  {time:"18:00", type:"pickup_window", label:"Evening pickup window closes",   sub:"Last chance for Slash #1048 members", status:"upcoming"},
];

export const MOCK_RATINGS = [
  {id:"r1", memberName:"Emeka O.",      rating:5, comment:"Very professional and fast. Hub is clean and organized.",       slashId:1048, createdAt:new Date(Date.now()-3600000).toISOString()},
  {id:"r2", memberName:"Seun L.",       rating:4, comment:"Good service. Would prefer earlier delivery times.",            slashId:1047, createdAt:new Date(Date.now()-86400000).toISOString()},
  {id:"r3", memberName:"Fatima K.",     rating:5, comment:"Great experience! Everything was well labelled.",               slashId:1048, createdAt:new Date(Date.now()-7200000).toISOString()},
  {id:"r4", memberName:"Olanrewaju T.", rating:3, comment:"Delivery was a bit late but attendant was very helpful.",       slashId:1046, createdAt:new Date(Date.now()-2*86400000).toISOString()},
  {id:"r5", memberName:"Grace E.",      rating:5, comment:"Seamless! QR scan worked perfectly. Will slash again.",         slashId:1048, createdAt:new Date(Date.now()-4*86400000).toISOString()},
];
