import { readFileFromPublic } from "../../utils/utils";

export const eciCMYK_v2_basic_profile = await readFileFromPublic("/sampleProfiles/CMYK/eciCMYK_v2_basic_profile.icc");
export const cardboard_brown_HP_C500_Dark_Paper_Tint = await readFileFromPublic("/sampleProfiles/CMYK/Cardboard_brown_HP-C500_Dark_Paper_Tint.icc");

 