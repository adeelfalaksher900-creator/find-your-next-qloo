// Optional package-supplied Chromium for isolated CI environments.
exports.launchOptions=async()=>{
  if(process.env.FYN_CHROMIUM_PACKAGE){const imported=require(process.env.FYN_CHROMIUM_PACKAGE),chromium=imported.default??imported;return {headless:true,executablePath:await chromium.executablePath()};}
  return {headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})};
};
