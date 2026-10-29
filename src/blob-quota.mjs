// A single private, strongly read blob is updated with compare-and-set writes.
export function blobQuotaStore(pathname='quota/discovery-v1.json'){
  return {
    async read(){
      const {get}=await import('@vercel/blob');
      const result=await get(pathname,{access:'private',useCache:false,abortSignal:AbortSignal.timeout(6000)});
      if(!result)return null;
      if(result.statusCode!==200||!result.stream||!result.blob?.etag||result.blob.size>131072)throw new Error('Invalid quota record');
      return {state:JSON.parse(await new Response(result.stream).text()),etag:result.blob.etag};
    },
    async write(state,etag){
      const {put}=await import('@vercel/blob');
      await put(pathname,JSON.stringify(state),{access:'private',addRandomSuffix:false,allowOverwrite:etag!==null,...(etag?{ifMatch:etag}:{}),contentType:'application/json',abortSignal:AbortSignal.timeout(6000)});
    }
  };
}
