// Optional package-supplied Chromium for isolated CI environments.
exports.launchOptions=async()=>{
  let proxy;
  if(process.env.FYN_USE_ENV_PROXY==='yes'){
    const value=process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy;
    if(value){const url=new URL(value);proxy={server:url.origin,bypass:'127.0.0.1,localhost',...(url.username?{username:decodeURIComponent(url.username),password:decodeURIComponent(url.password)}:{})};}
  }
  if(process.env.FYN_CHROMIUM_PACKAGE){const imported=require(process.env.FYN_CHROMIUM_PACKAGE),chromium=imported.default??imported;return {headless:true,executablePath:await chromium.executablePath()};}
  return {headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),...(proxy?{proxy}:{})};
};
