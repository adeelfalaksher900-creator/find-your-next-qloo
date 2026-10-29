import {runDiscovery} from '../src/agent.mjs';

// Deliberately fixed and bounded: one search followed by at most one insights call.
// Run in a private environment; never pass the key as a command-line argument.
if(process.env.QLOO_VERIFY_LIVE!=='yes'){
  console.error('Set QLOO_VERIFY_LIVE=yes to run a live, quota-consuming check.');
  process.exitCode=1;
}else if(!process.env.QLOO_API_KEY){
  console.error('QLOO_API_KEY is not configured in this environment.');
  process.exitCode=1;
}else{
  try{
    const result=await runDiscovery({seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'});
    console.log(`Live Qloo check completed: ${result.resolved.length} exact interest matched; ${result.items.length} book suggestions returned.`);
    if(!result.items.length)console.log('No book suggestions were returned; this does not prove coverage for other interests.');
  }catch(error){
    console.error(error?.status?error.message:'Qloo verification failed.');
    process.exitCode=1;
  }
}
