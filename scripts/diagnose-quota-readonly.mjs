// Intended for a protected preview build only. It never writes quota data,
// calls Qloo, or prints credentials, visitor identifiers, or stored values.
import {blobQuotaStore} from '../src/blob-quota.mjs';

try {
  const snapshot=await blobQuotaStore().read();
  const state=snapshot?.state;
  const valid=Boolean(state&&state.version===1&&/^\d{4}-\d{2}-\d{2}$/.test(state.day)&&
    Number.isSafeInteger(state.dailyCalls)&&state.dailyCalls>=0&&
    Number.isSafeInteger(state.totalCalls)&&state.totalCalls>=state.dailyCalls&&
    state.clients&&typeof state.clients==='object'&&!Array.isArray(state.clients)&&
    Object.entries(state.clients).every(([key,value])=>/^[a-f0-9]{64}$/.test(key)&&
      Number.isSafeInteger(value?.hour)&&value.hour>=0&&Number.isSafeInteger(value?.requests)&&value.requests>=0));
  console.log(JSON.stringify({readSucceeded:true,recordPresent:Boolean(snapshot),stateShapeValid:valid,
    recordDateIsFuture:valid&&state.day>new Date().toISOString().slice(0,10),etagPresent:typeof snapshot?.etag==='string'}));
} catch {
  console.log(JSON.stringify({readSucceeded:false}));
  process.exitCode=1;
}
