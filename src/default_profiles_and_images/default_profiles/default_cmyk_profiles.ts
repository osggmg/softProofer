import type { ICCProfile } from '../../types/types';
import { readFileFromPublic } from "../../utils/utils";

export const eciCMYK_v2_basic_profile = await readFileFromPublic("/sampleProfiles/CMYK/eciCMYK_v2_basic_profile.icc");
export const cardboard_brown_HP_C500_Dark_Paper_Tint = await readFileFromPublic("/sampleProfiles/CMYK/Cardboard_brown_HP-C500_Dark_Paper_Tint.icc");
export const epsonSC9000_7C_Inkjet_Multichannel = await readFileFromPublic("/sampleProfiles/CMYK/EpsonSC9000_7C-Inkjet_Multichannel.icc");
export const fogra39_Spectral_KCMY = await readFileFromPublic("/sampleProfiles/CMYK/Fogra39_Spectral_KCMY.icc");
export const fogra55_Multichannel = await readFileFromPublic("/sampleProfiles/CMYK/Fogra55_Multichannel.icc");
export const iSOcoatedv2_39L_basic_profile = await readFileFromPublic("/sampleProfiles/CMYK/ISOcoatedv2-39L_basic_profile.icc");

 export const defaultICCProfiles: ICCProfile[] = [
   { label: "eciCMYK_v2_basic_profile", bytes: eciCMYK_v2_basic_profile },
   {
     label: "cardboard_brown_HP_C500_Dark_Paper_Tint",
     bytes: cardboard_brown_HP_C500_Dark_Paper_Tint,
   },
   {
     label: "EpsonSC9000_7C-Inkjet_Multichannel",
     bytes: epsonSC9000_7C_Inkjet_Multichannel,
   },
   {
     label: "Fogra39_Spectral_KCMY",
     bytes: fogra39_Spectral_KCMY,
   },
   {
     label: "Fogra55_Multichannel",
     bytes: fogra55_Multichannel,
   },
   {
     label: "ISOcoatedv2-39L_basic_profile",
     bytes: iSOcoatedv2_39L_basic_profile,
   },
 ];