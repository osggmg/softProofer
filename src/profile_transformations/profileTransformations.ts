import { LcmsService } from "./lcmsService";
import { lcms } from "./lcmsSingleton";
import {
  getIccInputChannelCount,
  logClrtTag,
  mapCmykToProfileColorantOrder,
} from "./channelMapping.ts";
import {
  TYPE_RGB_8,
  TYPE_Lab_16,
  INTENT_ABSOLUTE_COLORIMETRIC,
} from "lcms-wasm";

let hSRGB: number | null = null;

function getSRGB() {
  if (hSRGB === null) hSRGB = lcms.createSRGBProfile();
  return hSRGB;
}

let hLAB: number | null = null;

const TRANSFORM_CHUNK_PIXELS = 262144;

function getLAB() {
  if (hLAB === null) hLAB = lcms.createLab4Profile();
  return hLAB;
}

export const doRGBSoftProof = (
  printerProfile: Uint8Array,
  inputRgb: Uint8Array,
  width: number,
  height: number,
) => {
  const hPrinterProfile = lcms.openProfileFromBytes(printerProfile);

  const transform = lcms.createProofingTransform({
    inputProfile: getSRGB(),
    outputProfile: getSRGB(),
    proofingProfile: hPrinterProfile,
    intent: 0,
    proofingIntent: 1,
    flags: LcmsService.FLAGS.SOFTPROOFING,
  });

  try {
    return lcms.doTransform(transform, inputRgb, width * height) as Uint8Array;
  } finally {
    lcms.deleteTransform(transform);
    lcms.closeProfile(hPrinterProfile);
  }
};

const createCmykToLabTransform = (cmykProfileHandle: number) => {
  const labProfile = getLAB();
  const inputFormat = lcms.formatterForColorspaceOfProfile(
    cmykProfileHandle,
    2,
    0,
  );

  console.log(
    `[CMYKtoLAB] profile-derived input format=0x${inputFormat.toString(16)}`,
  );

  const transform = lcms.createTransform(
    cmykProfileHandle,
    inputFormat,
    labProfile,
    TYPE_Lab_16,
    INTENT_ABSOLUTE_COLORIMETRIC,
    0x0100,
  );

  if (!transform) {
    throw new Error("Could not create CMYK -> Lab transform");
  }

  return transform;
};

const profileInputToLab = (
  input: Uint16Array,
  profileBytes: Uint8Array,
  channelsPerPixel: number,
) => {
  if (input.length % channelsPerPixel !== 0) {
    throw new Error(
      `Invalid input length ${input.length}. Expected ${channelsPerPixel} channels per pixel.`,
    );
  }

  const profileInputChannels = getIccInputChannelCount(profileBytes);
  if (!profileInputChannels) {
    throw new Error("Could not determine profile input channel count.");
  }

  if (profileInputChannels !== channelsPerPixel) {
    throw new Error(
      `Input channel count (${channelsPerPixel}) does not match profile input channel count (${profileInputChannels}).`,
    );
  }

  const profileHandle = lcms.openProfileFromBytes(profileBytes);
  if (!profileHandle) {
    throw new Error("Could not open profile");
  }

  const transform = createCmykToLabTransform(profileHandle);
  const pixelCount = input.length / channelsPerPixel;

  try {
    console.log(
      `[ProfileInputToLab] transforming ${pixelCount} pixels using ${channelsPerPixel} channels`,
    );
    const output = new Uint16Array(pixelCount * 3);

    for (
      let pixelOffset = 0;
      pixelOffset < pixelCount;
      pixelOffset += TRANSFORM_CHUNK_PIXELS
    ) {
      const chunkPixels = Math.min(
        TRANSFORM_CHUNK_PIXELS,
        pixelCount - pixelOffset,
      );
      const inputStart = pixelOffset * channelsPerPixel;
      const inputEnd = inputStart + chunkPixels * channelsPerPixel;
      const chunkInput = input.subarray(inputStart, inputEnd);

      const chunkOutput = lcms.doTransform(
        transform,
        chunkInput,
        chunkPixels,
      ) as Uint16Array;

      if (chunkOutput.length !== chunkPixels * 3) {
        throw new Error(
          `Profile input to Lab output length mismatch. Expected ${chunkPixels * 3}, got ${chunkOutput.length}.`,
        );
      }

      output.set(chunkOutput, pixelOffset * 3);
    }

    return output;
  } finally {
    lcms.deleteTransform(transform);
    lcms.closeProfile(profileHandle);
  }
};

export const ProfileInputToLAB = (
  input: Uint16Array,
  profileBytes: Uint8Array,
  channelsPerPixel: number,
) => profileInputToLab(input, profileBytes, channelsPerPixel);

const createRGBToLabTransform = (rgbProfileHandle?: number) => {
  const rgbProfile = rgbProfileHandle ?? getSRGB();
  const labProfile = getLAB();

  const transform = lcms.createTransform(
    rgbProfile,
    TYPE_RGB_8,
    labProfile,
    TYPE_Lab_16,
    INTENT_ABSOLUTE_COLORIMETRIC,
    0x0100,
  );

  if (!transform) {
    throw new Error("Could not create RGB -> Lab transform");
  }

  return transform;
};

const createLABToRGBTransform = (rgbProfileHandle?: number) => {
  const rgbProfile = rgbProfileHandle ?? getSRGB();
  const labProfile = getLAB();

  const transform = lcms.createTransform(
    labProfile,
    TYPE_Lab_16,
    rgbProfile,
    TYPE_RGB_8,
    INTENT_ABSOLUTE_COLORIMETRIC,
    0x0100,
  );

  if (!transform) {
    throw new Error("Could not create Lab -> RGB transform");
  }

  return transform;
};

export const CMYKtoLAB = (input: Uint16Array, CMYKProfile: Uint8Array) => {
  if (input.length % 4 !== 0) {
    throw new Error(
      `Invalid CMYK input length ${input.length}. Expected 4 channels per pixel.`,
    );
  }

  logClrtTag(CMYKProfile);
  const { mappedInput, profileChannelsPerPixel } = mapCmykToProfileColorantOrder(
    input,
    CMYKProfile,
  );

  return profileInputToLab(mappedInput, CMYKProfile, profileChannelsPerPixel);
};

export const LABtoRGB = (input: Uint16Array, RGBProfileBytes?: Uint8Array) => {
  if (input.length % 3 !== 0) {
    throw new Error(
      `Invalid Lab input length ${input.length}. Expected 3 channels per pixel.`,
    );
  }

  let rgbProfileHandle: number | undefined;

  if (RGBProfileBytes) {
    rgbProfileHandle = lcms.openProfileFromBytes(RGBProfileBytes);

    if (!rgbProfileHandle) {
      throw new Error("Could not open RGB profile");
    }
  }

  const transform = createLABToRGBTransform(rgbProfileHandle);
  const pixelCount = input.length / 3;

  try {
    const output = new Uint8Array(pixelCount * 3);

    for (
      let pixelOffset = 0;
      pixelOffset < pixelCount;
      pixelOffset += TRANSFORM_CHUNK_PIXELS
    ) {
      const chunkPixels = Math.min(
        TRANSFORM_CHUNK_PIXELS,
        pixelCount - pixelOffset,
      );
      const inputStart = pixelOffset * 3;
      const inputEnd = inputStart + chunkPixels * 3;
      const chunkInput = input.subarray(inputStart, inputEnd);

      const chunkOutput = lcms.doTransform(
        transform,
        chunkInput,
        chunkPixels,
      ) as Uint8Array;

      if (chunkOutput.length !== chunkPixels * 3) {
        throw new Error(
          `Lab to RGB output length mismatch. Expected ${chunkPixels * 3}, got ${chunkOutput.length}.`,
        );
      }

      output.set(chunkOutput, pixelOffset * 3);
    }

    return output;
  } finally {
    lcms.deleteTransform(transform);
    if (rgbProfileHandle) {
      lcms.closeProfile(rgbProfileHandle);
    }
  }
};

export const RGBtoLAB = (input: Uint8Array, RGBProfileBytes: Uint8Array | null) => {
  if (input.length % 3 !== 0) {
    throw new Error(
      `Invalid RGB input length ${input.length}. Expected 3 channels per pixel.`,
    );
  }

  let rgbProfileHandle: number | undefined;

  if (RGBProfileBytes) {
    rgbProfileHandle = lcms.openProfileFromBytes(RGBProfileBytes);

    if (!rgbProfileHandle) {
      throw new Error("Could not open RGB profile");
    }
  }

  const transform = createRGBToLabTransform(rgbProfileHandle); //assumes sRGB if no profile is provided
  const pixelCount = input.length / 3;

  try {
    const output = new Uint16Array(pixelCount * 3);

    for (
      let pixelOffset = 0;
      pixelOffset < pixelCount;
      pixelOffset += TRANSFORM_CHUNK_PIXELS
    ) {
      const chunkPixels = Math.min(
        TRANSFORM_CHUNK_PIXELS,
        pixelCount - pixelOffset,
      );
      const inputStart = pixelOffset * 3;
      const inputEnd = inputStart + chunkPixels * 3;
      const chunkInput = input.subarray(inputStart, inputEnd);

      const chunkOutput = lcms.doTransform(
        transform,
        chunkInput,
        chunkPixels,
      ) as Uint16Array;

      if (chunkOutput.length !== chunkPixels * 3) {
        throw new Error(
          `RGB to Lab output length mismatch. Expected ${chunkPixels * 3}, got ${chunkOutput.length}.`,
        );
      }

      output.set(chunkOutput, pixelOffset * 3);
    }

    return output;
  } finally {
    lcms.deleteTransform(transform);
    if (rgbProfileHandle) {
      lcms.closeProfile(rgbProfileHandle);
    }
  }
};
