import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';

const defaults={daily:100,total:1200,perClient:8};
const denied=(message,status)=>Object.assign(new Error(message),{status});
const unavailable=(code='quota_configuration')=>Object.assign(denied('Taste discovery is temporarily unavailable. Please try again later.',503),{code});
const limited=()=>denied('Taste discovery has reached its current limit. Please try again later.',429);
const count=n=>Number.isSafeInteger(n)&&n>=0;

// Vercel overwrites x-forwarded-for at its edge. Never trust it in a local run.
// An invalid primary header must fail closed rather than fall back to another.
export function trustedClientAddress(headers,vercel=false){
  const primary=headers['x-vercel-forwarded-for'];
  const value=primary===undefined&&vercel?headers['x-forwarded-for']:primary;
  return typeof value==='string'?value.trim():value;
}

export function clientFingerprint(address,salt){
  if(typeof address!=='string'||!isIP(address)||typeof salt!=='string'||salt.length<32)throw unavailable('quota_fingerprint');
  return createHmac('sha256',salt).update(address).digest('hex');
}

function valid(state){
  return state&&state.version===1&&/^\d{4}-\d{2}-\d{2}$/.test(state.day)&&count(state.dailyCalls)&&count(state.totalCalls)&&state.dailyCalls<=state.totalCalls&&state.clients&&typeof state.clients==='object'&&!Array.isArray(state.clients)&&
    Object.entries(state.clients).every(([key,value])=>/^[a-f0-9]{64}$/.test(key)&&count(value?.hour)&&count(value?.requests));
}

export async function reserveQuota({store,client,cost,now=Date.now(),limits=defaults}){
  if(!store||!/^[a-f0-9]{64}$/.test(client)||!Number.isSafeInteger(cost)||cost<1||cost>5||!Number.isSafeInteger(now)||now<0||!count(limits.daily)||!count(limits.total)||!count(limits.perClient))throw unavailable();
  const day=new Date(now).toISOString().slice(0,10),hour=Math.floor(now/3600000);
  for(let attempt=0;attempt<12;attempt++){
    let snapshot;try{snapshot=await store.read();}catch{throw unavailable('quota_read');}
    const state=snapshot===null?{version:1,day,dailyCalls:0,totalCalls:0,clients:{}}:snapshot?.state;
    if(!valid(state)||state.day>day||(snapshot&&typeof snapshot.etag!=='string'))throw unavailable('quota_state');
    const dailyCalls=state.day===day?state.dailyCalls:0;
    const clients=Object.fromEntries(Object.entries(state.clients).filter(([,entry])=>entry.hour===hour));
    const previous=clients[client]?.requests??0;
    if(dailyCalls+cost>limits.daily||state.totalCalls+cost>limits.total||previous>=limits.perClient)throw limited();
    clients[client]={hour,requests:previous+1};
    const next={version:1,day,dailyCalls:dailyCalls+cost,totalCalls:state.totalCalls+cost,clients};
    try{await store.write(next,snapshot?.etag??null);return;}catch(error){if(error?.code!=='QUOTA_CONFLICT')throw unavailable('quota_write');}
  }
  throw unavailable('quota_contention');
}
