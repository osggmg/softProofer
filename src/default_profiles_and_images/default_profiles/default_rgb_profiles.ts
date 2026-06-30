import type { ICCProfile } from '../../types/types';
import { readFileFromPublic } from "../../utils/utils";

export const coated_Fogra39L_VIGC_300 = await readFileFromPublic("/sampleProfiles/RGB/Coated_Fogra39L_VIGC_300.icc");
export const sRGB_Red_1 = await readFileFromPublic("/sampleProfiles/RGB/sRGB_Red 1.icc");
export const sRGB_v4 = await readFileFromPublic("/sampleProfiles/RGB/sRGB_v4.icc");

export const defaultRGBICCProfiles: ICCProfile[] = [
	{
		label: "Coated_Fogra39L_VIGC_300",
		bytes: coated_Fogra39L_VIGC_300,
	},
	{ label: "sRGB_Red 1", bytes: sRGB_Red_1 },
	{ label: "sRGB_v4", bytes: sRGB_v4 },
];