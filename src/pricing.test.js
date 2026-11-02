import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteOrder,quest3Only,orderPriceLabel} from './pricing.js';
import {makeSeed} from './seed.js';
test('rental pricing follows Individual, Family and Business plans',()=>{
 assert.equal(quoteOrder('individual',1).monthlyCents,7500);
 assert.equal(quoteOrder('family',4).monthlyCents,20000);
 assert.equal(quoteOrder('business',4).monthlyCents,30000);
 assert.equal(quoteOrder('business',9).monthlyCents,67500);
 assert.throws(()=>quoteOrder('family',3),/exactly 4/);
 assert.throws(()=>quoteOrder('individual',4),/exactly 1/);
 for(const qty of [0,-1,1.5,'',NaN,Infinity])assert.throws(()=>quoteOrder('business',qty));
 assert.throws(()=>quoteOrder('unknown',1),/Choose/);
});
test('Quest 3S migration archives model, inventory, orders and purchases without relabeling',()=>{
 const s=makeSeed();
 s.models.push({name:'Quest 3S',buffer:3});
 s.devices.push({id:'old-3s',asset:'OLD',model:'Quest 3S',orderId:'old-order'});
 s.orders.push({id:'old-order',model:'Quest 3S',amount:123,devices:['old-3s']});
 s.purchases.push({id:'old-po',kind:'headset',item:'Quest 3S',qty:9});
 const before=s.devices.filter(d=>d.model==='Quest 3').length;
 quest3Only(s);quest3Only(s);
 assert.equal(s.models.length,1);assert.equal(s.devices.length,before);
 assert.equal(s.archived.devices.length,1);assert.equal(s.archived.devices[0].model,'Quest 3S');
 assert.equal(s.archived.orders[0].amount,123);assert.equal(s.archived.purchases[0].qty,9);
 assert.equal(s.orders.some(o=>o.id==='old-order'),false);
});
test('legacy amounts are not guessed or repriced and fresh data supports Quest 3 only',()=>{
 assert.match(orderPriceLabel({amount:123}),/123.00.*legacy amount/);
 const s=makeSeed();assert.deepEqual(s.models.map(m=>m.name),['Quest 3']);
 assert.ok(s.devices.every(d=>d.model==='Quest 3'));
 assert.ok(s.orders.every(o=>o.model==='Quest 3'));
 assert.ok(s.purchases.filter(p=>p.kind==='headset').every(p=>p.item==='Quest 3'));
});
