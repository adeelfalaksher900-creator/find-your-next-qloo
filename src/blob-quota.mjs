// Storage metadata owns the write validator. HTTP GET ETags can add quotes or
// a weak prefix for transport; never send that wire representation to put().
const comparableTag=value=>typeof value==='string'?value.replace(/^W\//,'').replace(/^"(.*)"$/,'$1'):null;
const conflict=()=>Object.assign(new Error('Concurrent quota update'),{code:'QUOTA_CONFLICT'});
export function blobQuotaStore(pathname='quota/discovery-v1.json',loadSdk=()=>import('@vercel/blob')){
  return {
    async read(){
      const {get,head,BlobNotFoundError}=await loadSdk();
      let metadata;try{metadata=await head(pathname,{abortSignal:AbortSignal.timeout(6000)});}catch(error){if(typeof BlobNotFoundError==='function'&&error instanceof BlobNotFoundError)return null;throw error;}
      const result=await get(pathname,{access:'private',useCache:false,abortSignal:AbortSignal.timeout(6000)});
      if(!result)throw conflict();
      if(result.statusCode!==200||!result.stream||!result.blob?.etag||result.blob.size>131072)throw new Error('Invalid quota record');
      if(!metadata?.etag||comparableTag(metadata.etag)!==comparableTag(result.blob.etag)){await result.stream.cancel().catch(()=>{});throw conflict();}
      const reader=result.stream.getReader(),chunks=[];let size=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072)throw new Error('Quota record too large');chunks.push(value);}}
      catch(error){await reader.cancel().catch(()=>{});throw error;}
      return {state:JSON.parse(Buffer.concat(chunks).toString('utf8')),etag:metadata.etag};
    },
    async write(state,etag){
      const sdk=await loadSdk(),{put}=sdk;
      try{await put(pathname,JSON.stringify(state),{access:'private',addRandomSuffix:false,allowOverwrite:etag!==null,...(etag?{ifMatch:etag}:{}),contentType:'application/json',abortSignal:AbortSignal.timeout(6000)});}
      catch(error){
        // The SDK's subclasses retain name='Error'; check their actual type.
        const changed=typeof sdk.BlobPreconditionFailedError==='function'&&error instanceof sdk.BlobPreconditionFailedError;
        const created=etag===null&&typeof sdk.BlobError==='function'&&error instanceof sdk.BlobError&&/already exists/i.test(error.message);
        if(changed||created)throw Object.assign(new Error('Concurrent quota update'),{code:'QUOTA_CONFLICT'});
        throw error;
      }
    }
  };
}
