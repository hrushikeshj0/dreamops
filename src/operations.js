export const STEPS = [
  ['tested', 'Function test', 'Verify display, controllers, charging, tracking, and Wi-Fi.'],
  ['reset', 'Factory reset', 'Remove the previous owner’s configuration.'],
  ['account', 'Fresh Meta account', 'Create and sign in with a fresh account. Do not store passwords here.'],
  ['app', 'Install DreamPark', 'Install and launch the app successfully.'],
  ['vinyl', 'Apply printed vinyl', 'Apply one printed branding set.'],
  ['covers', 'Glue button covers', 'Apply one cover set made from a halved grommet.'],
  ['facepad', 'Fit silicone facepad', 'Fit one silicone facepad and complete final inspection.'],
];
export const MATERIALS = { vinyl: ['vinyl', 1], covers: ['covers', 1], facepad: ['facepad', 1] };
export const PACK = ['instructions', 'letter'];
export function combineManualAndQR(s) {
  const manual=s.supplies.find(x=>x.id==='instructions');
  if(manual){manual.name='Instruction manuals with QR code';manual.lead=null;manual.supplier='In-house printing';}
  const letter=s.supplies.find(x=>x.id==='letter');
  if(letter){letter.lead=null;letter.supplier='In-house printing';}
  const oldQR=s.supplies.find(x=>x.id==='qr');
  // Standalone codes are not extra printed manuals; keep their old counts as history.
  if(oldQR){s.retiredSupplies=[...(s.retiredSupplies||[]).filter(x=>x.id!=='qr'),oldQR];s.supplies=s.supplies.filter(x=>x.id!=='qr');}
  return s;
}
export const inHouse = item => ['vinyl','instructions','letter','covers'].includes(typeof item==='string'?item:item.id);
export const id = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Los_Angeles' });
export function dateAdd(date, days) { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + Number(days)); return d.toISOString().slice(0,10); }
export function dateLabel(date) { return date ? new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Not set'; }
export function integer(value, min=0) { const n=Number(value); if (!Number.isSafeInteger(n)||n<min) throw Error(`Enter a whole number of at least ${min}.`); return n; }
export const complete = d => !d.failed && STEPS.every(([key])=>d.checks[key]);
export const available = d => complete(d) && !d.orderId && !d.shipped;
export function stage(d,orders=[]) { if(d.shipped)return orders.find(o=>o.id===d.orderId)?.state==='delivered'?'Delivered':'Dispatched'; if(d.failed)return 'Repair / return hold'; if(complete(d))return d.orderId?'Reserved':'Ready to dispatch'; return d.startedAt||STEPS.some(([key])=>d.checks[key])?'In production':'Incoming from eBay'; }
export const PIPELINE=['Incoming from eBay','In production','Ready to dispatch','Dispatched','Delivered','Repair / return hold'];
export const pipelineStage=(d,orders=[])=>stage(d,orders)==='Reserved'?'Ready to dispatch':stage(d,orders);
export function startProduction(s,deviceId) {
  const d=s.devices.find(x=>x.id===deviceId);
  if(!d||d.failed||d.shipped||d.orderId||complete(d))throw Error('This headset cannot start production.');
  d.startedAt=d.startedAt||new Date().toISOString();
}
export function completeProduction(s,deviceId,operator='Local operator') {
  const d=s.devices.find(x=>x.id===deviceId);
  if(!d||d.failed||d.shipped||d.orderId||complete(d))throw Error('This headset cannot be completed again or while on hold / reserved.');
  // Preflight every remaining physical input before changing any checks or stock.
  const needs=Object.entries(MATERIALS).filter(([key])=>!d.checks[key]).map(([,value])=>value);
  for(const [key,n] of needs)if(supply(s,key).qty<n)throw Error(`Not enough ${supply(s,key).name}. Prepare or receive more before completing production.`);
  startProduction(s,deviceId);
  for(const [key] of STEPS)if(!d.checks[key])checkStep(s,deviceId,key,true);
  d.completedAt=new Date().toISOString();d.completedBy=operator;
}
export const supply = (s,key) => s.supplies.find(x=>x.id===key);
export function useSupplies(s, requirements) {
  for (const [key,n] of requirements) if (!supply(s,key)||supply(s,key).qty<n) throw Error(`Not enough ${supply(s,key)?.name||key}. Receive or prepare more first.`);
  for (const [key,n] of requirements) supply(s,key).qty-=n;
}
export function log(s,text,who='Team') { s.activity.unshift({id:id(),text,who,at:new Date().toISOString()}); s.activity=s.activity.slice(0,200); }
export function checkStep(s, deviceId, key, value) {
  const d=s.devices.find(x=>x.id===deviceId); if(!d)throw Error('Headset not found.');
  if(d.shipped||d.orderId)throw Error('Release this headset from its order before editing production.');
  if(d.failed)throw Error('Clear the repair hold before continuing production.');
  const index=STEPS.findIndex(x=>x[0]===key); if(index<0)throw Error('Unknown production step.');
  if(Boolean(d.checks[key])===value)return;
  if(value&&STEPS.slice(0,index).some(([k])=>!d.checks[k]))throw Error('Complete the earlier steps first.');
  if(!value&&STEPS.slice(index+1).some(([k])=>d.checks[k]))throw Error('Reopen later steps first.');
  if(value&&MATERIALS[key])useSupplies(s,[MATERIALS[key]]);
  // Reopening a physical step never returns used glue, vinyl, or facepads to stock.
  d.checks[key]=value; d.updated=today();
  if(value)d.startedAt=d.startedAt||new Date().toISOString();
  if(complete(d)){d.completedAt=new Date().toISOString();d.completedBy=d.owner||'Local operator';}else{delete d.completedAt;delete d.completedBy;}
}
export function addDevices(s,form) {
  if(form.model!=='Quest 3')throw Error('Only Meta Quest 3 headsets are supported.');
  const qty=integer(form.qty,1);if(qty>200)throw Error('Register at most 200 headsets per batch.');
  if(!form.prefix.trim())throw Error('Enter a unique asset ID or prefix.');
  const codes=Array.from({length:qty},(_,i)=>qty===1?form.prefix.trim():`${form.prefix.trim()}-${String(i+1).padStart(3,'0')}`);
  if(codes.some(code=>s.devices.some(d=>d.asset.toLowerCase()===code.toLowerCase())))throw Error('An asset ID in this batch already exists.');
  if(form.certified && !form.reason?.trim()) throw Error('Add a verification note for ready stock.');
  // Existing finished stock already has its materials fitted; do not deduct loose stock again.
  for(const asset of codes)s.devices.push({id:id(),asset,model:form.model,source:'eBay',seller:form.seller||'',reference:form.reference||'',received:today(),checks:Object.fromEntries(STEPS.map(([k])=>[k,Boolean(form.certified)])),owner:form.owner||'',notes:form.reason||'',failed:false,orderId:null,shipped:false});
}
export function allocate(s,orderId) {
  const o=s.orders.find(x=>x.id===orderId); if(!o||o.state!=='open')throw Error('This order is not awaiting allocation.');
  if(o.payment!=='Paid')throw Error('Confirm payment before reserving headsets.');
  const ready=s.devices.filter(d=>d.model===o.model&&available(d));
  if(ready.length<o.qty)throw Error(`Only ${ready.length} ${o.model} ready to dispatch. This order needs ${o.qty}. Complete production first.`);
  o.devices=ready.slice(0,o.qty).map(d=>d.id); ready.slice(0,o.qty).forEach(d=>d.orderId=o.id);o.state='reserved';
}
export function release(s,orderId) { const o=s.orders.find(x=>x.id===orderId); if(!o||o.state!=='reserved')throw Error('Only reserved orders can be released.');s.devices.filter(d=>d.orderId===o.id).forEach(d=>d.orderId=null);o.devices=[];o.state='open'; }
export function ship(s,orderId,form) {
  const o=s.orders.find(x=>x.id===orderId);if(!o||o.state!=='reserved'||o.payment!=='Paid')throw Error('Reserve a paid order before shipping.');
  if(!PACK.every(k=>form[k]))throw Error('Pack an instruction manual with its printed QR code and a thank-you letter before shipping.');
  if(!form.tracking.trim()||!form.carrier.trim()||!form.shippedDate)throw Error('Carrier, tracking number, and ship date are required.');
  const days=integer(form.transit,1);if(o.devices.length!==o.qty||o.devices.some(k=>!s.devices.some(d=>d.id===k&&complete(d)&&d.orderId===o.id&&!d.shipped)))throw Error('Assigned headsets are not ready.');
  useSupplies(s,PACK.map(k=>[k,1]));o.state='shipped';o.shipment={carrier:form.carrier,tracking:form.tracking,shippedDate:form.shippedDate,transit:days,eta:dateAdd(form.shippedDate,days),delivered:null,pack:PACK};o.devices.forEach(k=>s.devices.find(d=>d.id===k).shipped=true);
}
export function receive(s,purchaseId) {
  const p=s.purchases.find(x=>x.id===purchaseId);if(!p||p.received)throw Error('This purchase has already been received.');
  if(p.kind==='headset')addDevices(s,{qty:p.qty,prefix:`EB-${p.id.slice(0,6)}`,model:p.item, seller:p.supplier,reference:p.reference});
  else supply(s,p.item).qty+=p.qty;
  p.received=today();
}
export function alerts(s) {
  const out=[];
  for(const x of s.supplies)if(x.qty<=x.buffer) {const inbound=s.purchases.filter(p=>p.kind==='supply'&&p.item===x.id&&!p.received).sort((a,b)=>a.eta.localeCompare(b.eta));out.push({title:`${x.name} ${x.qty===0?'out of stock':'running low'}`,text:inHouse(x)?`${x.qty} ${x.unit} left · buffer ${x.buffer}. ${x.id==='covers'?'Prepare more cover sets in-house.':'Print more in-house.'}`:`${x.qty} ${x.unit} left · buffer ${x.buffer} · ${x.lead} day lead time.${inbound.length?` ${inbound.reduce((n,p)=>n+p.qty,0)} inbound; next ETA ${dateLabel(inbound[0].eta)}.`:' No purchase logged.'}`,view:'supplies',level:x.qty===0?'risk':'warn'});}
  for(const m of s.models){const n=s.devices.filter(d=>d.model===m.name&&available(d)).length;if(n<=m.buffer)out.push({title:`${m.name}: ${n} ready to dispatch`,text:`Target buffer ${m.buffer}. ${s.devices.filter(d=>d.model===m.name&&!d.shipped&&!d.failed&&!complete(d)).length} in production. eBay arrivals must pass testing before they count as ready.`,view:'production',level:n===0?'risk':'warn'});}
  for(const p of s.purchases)if(!p.received&&p.eta<today())out.push({title:'Inbound delivery overdue',text:`${p.qty} × ${p.kind==='headset'?p.item:supply(s,p.item)?.name} from ${p.supplier} · expected ${dateLabel(p.eta)}`,view:'purchases',level:'risk'});
  for(const o of s.orders)if(o.state==='shipped'&&o.shipment.eta<today())out.push({title:`Confirm delivery: ${o.number}`,text:`${o.customer} · expected ${dateLabel(o.shipment.eta)}. No delivery confirmation recorded.`,view:'orders',level:'warn'});
  return out;
}
export function briefing(s,q) {
  const ready=s.devices.filter(available),a=alerts(s),text=q.toLowerCase();
  if(/slow|moving/.test(text))return 'There is not enough shipment history to rank slow-moving products reliably. Use Orders to record dispatches and confirmed deliveries first.';
  if(/face|silicone|china/.test(text)){const x=supply(s,'facepad');return `${x.qty} silicone facepads remain, against a buffer of ${x.buffer}. Plan ${x.lead} days for China supply. Incoming facepads do not count as usable until received.`;}
  if(/ready|dispatch|stock/.test(text))return `${ready.length} headsets are ready and unreserved: ${s.models.map(m=>`${m.name}: ${ready.filter(d=>d.model===m.name).length}`).join('; ')}. Each has passed all seven production checks. ${a.filter(x=>x.view==='supplies').length} material alerts need attention.`;
  if(/pay/.test(text))return `${s.orders.filter(o=>o.payment!=='Paid').length} orders await payment. Open Payments to confirm them; unpaid orders cannot reserve stock.`;
  if(/production|bottleneck/.test(text))return `${s.devices.filter(d=>stage(d)==='Incoming from eBay').length} headsets await production, ${s.devices.filter(d=>stage(d)==='In production').length} are in production, and ${s.devices.filter(d=>d.failed&&!d.shipped).length} are on repair / return hold. Open each headset’s expandable checklist for unfinished tasks.`;
  if(/alert|order|replen|brief|supply/.test(text))return a.length?a.slice(0,4).map(x=>`${x.title}. ${x.text}`).join('\n\n'):'No replenishment or delivery alerts right now.';
  return 'I can summarize ready stock, production bottlenecks, facepad supply, replenishment alerts, and payment holds. Try “How many headsets are ready to dispatch?”';
}
