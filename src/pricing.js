export const MODEL='Quest 3';
export const PLANS={
  individual:{name:'Individual',headsets:1,monthlyCents:7500,description:'1 headset · $75 / month'},
  family:{name:'Family',headsets:4,monthlyCents:20000,description:'4 headsets · $200 / month'},
  business:{name:'Business',monthlyCents:7500,description:'$75 / headset / month'},
};
export const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(cents/100);
export function quoteOrder(plan,quantity){
  const p=PLANS[plan];if(!p)throw Error('Choose a rental plan.');
  const qty=Number(quantity);
  if(!Number.isSafeInteger(qty)||qty<1)throw Error('Enter a positive whole number of headsets.');
  if(p.headsets&&qty!==p.headsets)throw Error(`${p.name} includes exactly ${p.headsets} headset${p.headsets===1?'':'s'}.`);
  const monthlyCents=p.monthlyCents*(plan==='business'?qty:1);
  if(!Number.isSafeInteger(monthlyCents))throw Error('Quantity is too large.');
  return {plan,planName:p.name,qty,monthlyCents,amount:monthlyCents/100,billingPeriod:'month',priceVersion:'2026-10-24',model:MODEL};
}
// Preserve historical recorded amounts. Never guess a plan or reprice an old payment record.
export const orderPriceLabel=o=>o.monthlyCents!==undefined?`${money(o.monthlyCents)} / month`:`${money(Math.round(o.amount*100))} · legacy amount`;
export function quest3Only(s){
  const unsupported=x=>/quest\s*3s/i.test(x||'');
  const badDevices=new Set(s.devices.filter(d=>unsupported(d.model)).map(d=>d.id));
  const badOrders=new Set(s.orders.filter(o=>unsupported(o.model)||(o.devices||[]).some(k=>badDevices.has(k))).map(o=>o.id));
  const archive=(key,remove)=>{const gone=s[key].filter(remove);if(!gone.length)return; s.archived=s.archived||{};const old=s.archived[key]||[];s.archived[key]=[...old,...gone.filter(x=>!old.some(y=>(y.id||y.name)===(x.id||x.name)))];s[key]=s[key].filter(x=>!remove(x));};
  archive('models',m=>unsupported(m.name));
  archive('devices',d=>badDevices.has(d.id)||badOrders.has(d.orderId));
  archive('orders',o=>badOrders.has(o.id));
  archive('purchases',p=>p.kind==='headset'&&unsupported(p.item));
  archive('activity',a=>unsupported(a.text));
  return s;
}
