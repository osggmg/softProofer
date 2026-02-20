import { LcmsService } from "./lcmsService";

export const lcms = new LcmsService();

// create one shared init promise
export const lcmsReady = (async () => {
  await lcms.init();
  return lcms;
})();
