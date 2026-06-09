import type { ICCProfile } from '../../types/types';
import { readFileFromPublic } from "../../utils/utils";

export const eciCMYK_v2_basic_profile = await readFileFromPublic("/sampleProfiles/CMYK/eciCMYK_v2_basic_profile.icc");
export const cardboard_brown_HP_C500_Dark_Paper_Tint = await readFileFromPublic("/sampleProfiles/CMYK/Cardboard_brown_HP-C500_Dark_Paper_Tint.icc");

 export const defaultICCProfiles: ICCProfile[] = [
   { label: "eciCMYK_v2_basic_profile", bytes: eciCMYK_v2_basic_profile },
   {
     label: "cardboard_brown_HP_C500_Dark_Paper_Tint",
     bytes: cardboard_brown_HP_C500_Dark_Paper_Tint,
   },
 ];