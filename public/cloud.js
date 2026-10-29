import {parseCollectionFile} from './core.js';
const encoder=new TextEncoder(),storageKey='find-your-next-cloud-v1';
const blank=()=>({interests:[],saved:[]});
const pack=value=>JSON.stringify({format:'find-your-next',version:1,interests:value.interests,saved:value.saved});
const same=(a,b)=>pack(a)===pack(b);
const encode=bytes=>{let text='';for(const b of bytes)text+=String.fromCharCode(b);return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');};
const decode=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function createSyncKey(){return 'fyn1_'+encode(crypto.getRandomValues(new Uint8Array(32)));}
export async function deriveCollection(key){
  if(typeof key!=='string'||!/^fyn1_[A-Za-z0-9_-]{43}$/.test(key))throw new Error('Enter the complete sync key beginning with fyn1_.');
  const raw=decode(key.slice(5));if(raw.length!==32||encode(raw)!==key.slice(5))throw new Error('The sync key is invalid.');
  const material=await crypto.subtle.importKey('raw',raw,'HKDF',false,['deriveBits','deriveKey']);
  const params=purpose=>({name:'HKDF',hash:'SHA-256',salt:encoder.encode('find-your-next-v1'),info:encoder.encode(purpose)});
  const id=hex(new Uint8Array(await crypto.subtle.deriveBits(params('collection-id'),material,256)));
  const token=hex(new Uint8Array(await crypto.subtle.deriveBits(params('collection-access'),material,256)));
  const cipher=await crypto.subtle.deriveKey(params('collection-encryption'),material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  return {id,token,cipher};
}
export async function encryptCollection(credentials,value){
  const data=encoder.encode(pack(value));if(data.length>200000)throw new Error('The collection is too large to sync. Keep a local backup.');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(credentials.id)},credentials.cipher,data);
  return {v:1,iv:encode(iv),ciphertext:encode(new Uint8Array(bytes))};
}
export async function decryptCollection(credentials,box){
  if(!box||box.v!==1||typeof box.iv!=='string'||!/^[A-Za-z0-9_-]{16}$/.test(box.iv)||typeof box.ciphertext!=='string'||!/^[A-Za-z0-9_-]{22,266800}$/.test(box.ciphertext))throw new Error('The cloud collection could not be read.');
  try{
    const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(box.iv),additionalData:encoder.encode(credentials.id)},credentials.cipher,decode(box.ciphertext));
    return parseCollectionFile(new TextDecoder().decode(data));
  }catch{throw new Error('The collection could not be decrypted with this sync key.');}
}
export function mergeCloudCollections(base,local,remote){
  const result=blank();
  for(const field of ['interests','saved']){
    const b=new Map(base[field].map(x=>[x.id,x])),l=new Map(local[field].map(x=>[x.id,x])),r=new Map(remote[field].map(x=>[x.id,x]));
    const removed=new Set([...b.keys()].filter(id=>!l.has(id)||!r.has(id)));
    const merged=new Map([...r,...l]);result[field]=[...merged.values()].filter(x=>!removed.has(x.id));if(result[field].length>60)throw new Error('The combined collection is full. Remove items or download a backup before syncing.');
  }
  return result;
}
export function collectionTransport(base='/api/collection',fetcher=fetch){
  return async(method,credentials,input)=>{
    const url=base+(credentials?'?id='+encodeURIComponent(credentials.id):'');
    let res;try{res=await fetcher(url,{method,headers:{...(credentials?{Authorization:'Bearer '+credentials.token}:{}),...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{}),signal:AbortSignal.timeout(15000)});}catch{throw new Error('Cloud sync could not be reached. Your changes stay on this device.');}
    if(res.status===204)return {status:204};let body;try{body=await res.json();}catch{throw new Error('Cloud sync returned an unreadable response.');}
    if(!res.ok)throw Object.assign(new Error(body.error||'Cloud sync is unavailable.'),{status:res.status});
    return {...body,status:res.status};
  };
}
export class CloudCollection{
  constructor({getSnapshot,applySnapshot,onStatus=()=>{},clean=x=>x,transport=collectionTransport(),storage=localStorage}){
    this.getSnapshot=getSnapshot;this.applySnapshot=applySnapshot;this.onStatus=onStatus;this.clean=clean;this.transport=transport;this.storage=storage;this.context=null;this.configured=false;this.busy=false;this.message='Checking cloud collection…';this.error=false;this.timer=null;
  }
  emit(message=this.message,error=this.error){this.message=message;this.error=error;this.onStatus({configured:this.configured,connected:!!this.context,busy:this.busy,message:message+(this.storageWarning||''),error:error||!!this.storageWarning});}
  persist(){try{if(this.context)this.storage.setItem(storageKey,JSON.stringify({key:this.context.key,base:this.context.base,revision:this.context.revision}));else this.storage.removeItem(storageKey);this.storageWarning='';}catch{this.storageWarning=this.context?' Keep your sync key; this browser could not remember the connection.':' This browser could not remove its stored connection. Clear site data to stay disconnected after reload.';}}
  async init(){
    try{this.configured=(await this.transport('GET')).configured===true;}catch{this.configured=false;}
    if(!this.configured){this.emit('Cloud collection is unavailable. Your collection stays on this device.');return;}
    let saved;try{const text=this.storage.getItem(storageKey);if(text?.length<250000)saved=JSON.parse(text);}catch{}
    if(saved){try{const credentials=await deriveCollection(saved.key);this.context={key:saved.key,credentials,base:this.clean(parseCollectionFile(pack(saved.base))),revision:Number.isSafeInteger(saved.revision)?saved.revision:0};await this.sync();return;}catch{this.context=null;}}
    this.emit('Connect devices with a private sync key.');
  }
  async create(){
    if(this.busy||this.context)return;if(!this.configured)throw new Error('Cloud collection is unavailable.');this.busy=true;this.emit('Creating your private collection…',false);
    try{const key=createSyncKey(),credentials=await deriveCollection(key),snapshot=this.getSnapshot(),box=await encryptCollection(credentials,snapshot),data=await this.transport('PUT',credentials,{expectedRevision:0,box});
      if(!Number.isSafeInteger(data.revision)||data.revision<1)throw new Error('Cloud collection returned an invalid revision.');
      this.context={key,credentials,base:snapshot,revision:data.revision};this.persist();this.emit('Saved to cloud. Keep your sync key to connect another device.',false);
    }catch(error){this.emit(error.message,true);throw error;}finally{this.busy=false;this.emit();if(this.context&&!this.error&&!same(this.getSnapshot(),this.context.base))this.schedule();}
  }
  async connect(key){
    if(this.busy||this.context)return;if(!this.configured)throw new Error('Cloud collection is unavailable.');this.busy=true;this.emit('Connecting your collection…',false);
    try{const credentials=await deriveCollection(key.trim()),data=await this.transport('GET',credentials);if(!Number.isSafeInteger(data.revision)||data.revision<1)throw new Error('Invalid collection revision.');
      const remote=this.clean(await decryptCollection(credentials,data.box)),merged=mergeCloudCollections(blank(),this.getSnapshot(),remote);
      this.context={key:key.trim(),credentials,base:remote,revision:data.revision};this.applySnapshot(merged);this.persist();this.emit('Collection connected.',false);
    }catch(error){this.emit(error.message,true);throw error;}finally{this.busy=false;this.emit();}
    await this.sync();
  }
  changed(){if(this.context&&!same(this.getSnapshot(),this.context.base))this.schedule();}
  schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.sync().catch(()=>{}),1000);}
  async sync(){
    if(!this.context||this.busy)return;clearTimeout(this.timer);this.busy=true;const context=this.context;this.emit('Syncing collection…',false);
    try{for(let attempt=0;attempt<3;attempt++){
      const data=await this.transport('GET',context.credentials);if(this.context!==context)return;
      if(!Number.isSafeInteger(data.revision)||data.revision<1)throw new Error('Invalid collection revision.');
      const remote=this.clean(await decryptCollection(context.credentials,data.box)),merged=mergeCloudCollections(context.base,this.getSnapshot(),remote);
      this.applySnapshot(merged);
      if(same(merged,remote)){context.base=remote;context.revision=data.revision;this.persist();this.emit('Collection is up to date.',false);return;}
      const box=await encryptCollection(context.credentials,merged);
      try{const written=await this.transport('PUT',context.credentials,{expectedRevision:data.revision,box});if(this.context!==context)return;
        if(!Number.isSafeInteger(written.revision)||written.revision<1)throw new Error('Invalid collection revision.');
        context.base=merged;context.revision=written.revision;this.persist();this.emit('Saved to cloud.',false);return;
      }catch(error){if(error.status===409)continue;throw error;}
    }throw new Error('Another device is editing this collection. Please try syncing again.');
    }catch(error){this.emit(error.message,true);}finally{this.busy=false;this.emit();if(this.context===context&&!this.error&&!same(this.getSnapshot(),context.base))this.schedule();}
  }
  key(){return this.context?.key??'';}
  disconnect(){clearTimeout(this.timer);this.context=null;this.persist();this.emit('Disconnected on this device. Local items were kept.',false);}
  async deleteCloud(){
    if(this.busy||!this.context)return;this.busy=true;this.emit('Deleting the cloud copy…',false);
    try{const c=this.context,data=await this.transport('GET',c.credentials);await this.transport('DELETE',c.credentials,{expectedRevision:data.revision});this.disconnect();this.emit('Cloud copy deleted. Local items were kept.',false);}
    catch(error){this.emit(error.message,true);throw error;}finally{this.busy=false;this.emit();}
  }
}
