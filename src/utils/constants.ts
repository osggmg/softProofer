export const colorsInput = [
  "rgb(255, 0, 0)", // red
  "rgb(0, 255, 0)", // green
  "rgb(0, 0, 255)", // blue
  "rgb(255, 255, 0)", // yellow
  "rgb(0, 255, 255)", // cyan
  "rgb(255, 0, 255)", // magenta
  "rgb(255, 255, 255)", // white

  "rgb(0, 0, 0)", // black
  "rgb(128, 128, 128)", // mid gray
  "rgb(64, 64, 64)", // dark gray
  "rgb(192, 192, 192)", // light gray
  "rgb(200, 100, 0)", // orange-ish
  "rgb(150, 0, 200)", // violet
  "rgb(0, 150, 100)", // teal

  "rgb(238, 4, 4)", // strong red
  "rgb(10, 200, 10)", // vivid green
  "rgb(10, 10, 200)", // vivid blue
  "rgb(240, 180, 40)", // warm yellow
  "rgb(50, 120, 200)", // desaturated blue
  "rgb(180, 60, 120)", // pinkish
  "rgb(90, 200, 180)", // light aqua
];

export const colorsInputAsAFlatMapU8Arr = new Uint8Array(
  colorsInput.flatMap((c) =>
    c
      .slice(4, -1)
      .split(",")
      .map((v) => Number(v.trim())),
  ),
);

export const colorsInputAsAFlatMapU16Arr = new Uint16Array(
  colorsInput.flatMap((c) =>
    c
      .slice(4, -1)
      .split(",")
      .map((v) => Math.round(Number(v.trim()) * 257))
  )
);



export const XYZColorSpace = 0x58595A20;
export const LabColorSpace = 0x4C616220;
export const LuvColorSpace = 0x4C757620;
export const YCbCrColorSpace = 0x59436272;
export const YxyColorSpace = 0x59787920;
export const RGBColorSpace = 0x52474220;
export const GrayColorSpace = 0x47524159;
export const HSVColorSpace = 0x48535620;
export const HLSColorSpace = 0x484C5320;
export const CMYKColorSpace = 0x434D594B;
export const CMYColorSpace = 0x434D5920;

export const MCH1ColorSpace = 0x4D434831;
export const MCH2ColorSpace = 0x4D434832;
export const MCH3ColorSpace = 0x4D434833;
export const MCH4ColorSpace = 0x4D434834;
export const MCH5ColorSpace = 0x4D434835;
export const MCH6ColorSpace = 0x4D434836;
export const MCH7ColorSpace = 0x4D434837;
export const MCH8ColorSpace = 0x4D434838;
export const MCH9ColorSpace = 0x4D434839;

export const MCHAColorSpace = 0x4D43483A;
export const MCHBColorSpace = 0x4D43483B;
export const MCHCColorSpace = 0x4D43483C;
export const MCHDColorSpace = 0x4D43483D;
export const MCHEColorSpace = 0x4D43483E;
export const MCHFColorSpace = 0x4D43483F;

export const NamedColorSpace = 0x6e6d636c;

export const Color1Space = 0x31434C52;
export const Color2Space = 0x32434C52;
export const Color3Space = 0x33434C52;
export const Color4Space = 0x34434C52;
export const Color5Space = 0x35434C52;
export const Color6Space = 0x36434C52;
export const Color7Space = 0x37434C52;
export const Color8Space = 0x38434C52;
export const Color9Space = 0x39434C52;

export const Color10Space = 0x41434C52;
export const Color11Space = 0x42434C52;
export const Color12Space = 0x43434C52;
export const Color13Space = 0x44434C52;
export const Color14Space = 0x45434C52;
export const Color15Space = 0x46434C52;

export const LuvKColorSpace = 0x4C75764B;