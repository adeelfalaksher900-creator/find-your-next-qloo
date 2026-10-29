// Two isolated client states, real same-origin production proxy, own fixture only.
import assert from 'node:assert/strict';
import {CloudCollection,collectionTransport} from '../public/cloud.js';
if(process.env.FYN_CLOUD_LIVE!=='yes')throw Error('Set FYN_CLOUD_LIVE=yes to run the authorized deployed-cloud check.');
const base=new URL(process.env.FYN_BASE_URL||'https://find-your-next-qloo.vercel.app/');if(base.protocol!=='https:')throw Error('HTTPS required.');
const transport=collectionTransport(new URL('/api/collection',base).href);
function client(initial){let value=structuredClone(initial);const memory=new Map();const cloud=new CloudCollection({transport,storage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},getSnapshot:()=>structuredClone(value),applySnapshot:x=>{value=structuredClone(x);}});return {cloud,get value(){return value;},set value(x){value=x;}};}
const item={id:'manual:book:synthetic cloud check',title:'Synthetic cloud check',kind:'book',qlooType:'book',source:'Your entry',url:null,image:null};
const a=client({interests:[item],saved:[item]}),b=client({interests:[],saved:[]});
try{await a.cloud.init();assert.equal(a.cloud.configured,true);await a.cloud.create();await b.cloud.init();await b.cloud.connect(a.cloud.key());assert.equal(b.value.saved[0].id,item.id);console.log('PASS production proxy: encrypted create and second-client restore');
  a.value.saved=[];await a.cloud.sync();assert.equal(a.cloud.error,false);await b.cloud.sync();assert.equal(b.value.saved.length,0);assert.equal(b.value.interests[0].id,item.id);console.log('PASS production proxy: cross-client removal without losing interests');
}finally{clearTimeout(a.cloud.timer);clearTimeout(b.cloud.timer);if(a.cloud.context){await a.cloud.deleteCloud();assert.equal(a.cloud.context,null);console.log('PASS production proxy: synthetic cloud copy removed; local interests retained');}clearTimeout(a.cloud.timer);clearTimeout(b.cloud.timer);}
