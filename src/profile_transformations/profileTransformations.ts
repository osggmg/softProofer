import { LcmsService } from "./lcmsService";
import { lcms} from "./lcmsSingleton";

let hSRGB: number | null = null;

function getSRGB() {
  if (hSRGB === null) hSRGB = lcms.createSRGBProfile();
  return hSRGB;
}

export const doSoftProof = (
  printerProfile: Uint8Array | number,
  inputRgb: Uint8Array,
  width: number,
  height: number,
) => {
  const openedHere = printerProfile instanceof Uint8Array;
  const hPrinter = openedHere ? lcms.openProfileFromBytes(printerProfile) : printerProfile;

  const xform = lcms.createProofingTransform({
    inputProfile: getSRGB(),
    outputProfile: getSRGB(),
    proofingProfile: hPrinter,
    intent: 0,
    proofingIntent: 1,
    flags: LcmsService.FLAGS.SOFTPROOFING,
  });

  const outRgb = lcms.doTransform(xform, inputRgb, width * height);
  console.log("transformDone")

  lcms.deleteTransform(xform);
  if (openedHere) lcms.closeProfile(hPrinter);

  return outRgb;
};
