export type ICCProfile = {
  label: string;
  value: string;
  bytes?: Uint8Array;
  handle?: number; // points to a point in memory where the profile is
};


export type RGBTriplet = [number, number, number];