import { instantiate } from "lcms-wasm";
import wasmFileURI from "lcms-wasm/dist/lcms.wasm?url";

export type RenderingIntent = 0 | 1 | 2 | 3;

export class LcmsService {
  private lcms!: Awaited<ReturnType<typeof instantiate>>;

  async init() {
    this.lcms = await instantiate({
      locateFile: function (name) {
        return wasmFileURI; //this is needed specifically for vite so the wrapper works
      },
    });
    console.log(this.lcms);
  }

  createSRGBProfile(): number {
    return this.lcms.cmsCreate_sRGBProfile();
  }

  openProfileFromBytes(bytes: Uint8Array): number {
    const h = this.lcms.cmsOpenProfileFromMem(bytes, bytes.length);
    if (!h) throw new Error("Could not open ICC profile from bytes");
    return h;
  }

  closeProfile(hProfile: number) {
    this.lcms.cmsCloseProfile(hProfile);
  }

  createProofingTransform(params: {
    inputProfile: number;
    outputProfile: number;
    proofingProfile: number;
    bytesPerSample?: 1 | 2 | 4;
    inputIsFloat?: 0 | 1;
    outputIsFloat?: 0 | 1;
    intent?: RenderingIntent;
    proofingIntent?: RenderingIntent;
    flags?: number;
  }): number {
    const {
      inputProfile,
      outputProfile,
      proofingProfile,
      bytesPerSample = 1,
      inputIsFloat = 0,
      outputIsFloat = 0,
      intent = 0,
      proofingIntent = 1,
      flags = 0,
    } = params;

    const inputFormat = this.lcms.cmsFormatterForColorspaceOfProfile(
      inputProfile,
      bytesPerSample,
      inputIsFloat,
    );

    const outputFormat = this.lcms.cmsFormatterForColorspaceOfProfile(
      outputProfile,
      bytesPerSample,
      outputIsFloat,
    );

    const xform = this.lcms.cmsCreateProofingTransform(
      inputProfile,
      inputFormat,
      outputProfile,
      outputFormat,
      proofingProfile,
      intent,
      proofingIntent,
      flags,
    );

    if (!xform) throw new Error("Could not create proofing transform");
    return xform;
  }

  doTransform(
    transform: number,
    input: Uint8Array | Uint16Array | Float32Array,
    pixelCount: number,
  ) {
    return this.lcms.cmsDoTransform(transform, input, pixelCount);
  }

  deleteTransform(transform: number) {
    this.lcms.cmsDeleteTransform(transform);
  }

  static FLAGS = {
    SOFTPROOFING: 0x4000,
    BLACKPOINTCOMPENSATION: 0x2000,
    GAMUTCHECK: 0x1000,
  };
}



