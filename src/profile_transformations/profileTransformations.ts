import { LcmsService } from "./lcmsService";
import { lcms} from "./lcmsSingleton";

let hSRGB: number | null = null;

function getSRGB() {
  if (hSRGB === null) hSRGB = lcms.createSRGBProfile();
  return hSRGB;
}

export const doSoftProof = (
  printerProfile: Uint8Array,
  inputRgb: Uint8Array,
  width: number,
  height: number,
) => {
  const hPrinterProfile = lcms.openProfileFromBytes(printerProfile); //h means handle

  const xform = lcms.createProofingTransform({
    inputProfile: getSRGB(),
    outputProfile: getSRGB(),
    proofingProfile: hPrinterProfile,
    intent: 0,
    proofingIntent: 1,
    flags: LcmsService.FLAGS.SOFTPROOFING,
  });

  const outRgb = lcms.doTransform(xform, inputRgb, width * height);

  lcms.deleteTransform(xform);
  lcms.closeProfile(hPrinterProfile);

  return outRgb;
};
