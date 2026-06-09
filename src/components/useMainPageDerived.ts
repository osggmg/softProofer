import { useMemo } from "react";
import type { ICCProfile, ImageObject } from "../types/types";
import { getImageColorModel, getProfileColorModel } from "../utils/utils";
import { emptyMonitorProfileValue } from "../utils/constants";

interface UseMainPageDerivedParams {
  loadedImages: ImageObject[];
  selectedImageIdLeft: string | null;
  selectedImageIdRight: string | null;
  availableICCProfiles: ICCProfile[];
  availableMonitorProfiles: ICCProfile[];
  selectedICCProfileNameLeft: string;
  selectedICCProfileNameRight: string;
}

export function useMainPageDerived({
  loadedImages,
  selectedImageIdLeft,
  selectedImageIdRight,
  availableICCProfiles,
  availableMonitorProfiles,
  selectedICCProfileNameLeft,
  selectedICCProfileNameRight,
}: UseMainPageDerivedParams) {
  const selectedImageLeft = useMemo(
    () => loadedImages.find((img) => img.id === selectedImageIdLeft) ?? null,
    [loadedImages, selectedImageIdLeft],
  );

  const selectedImageRight = useMemo(
    () => loadedImages.find((img) => img.id === selectedImageIdRight) ?? null,
    [loadedImages, selectedImageIdRight],
  );

  const selectedImageColorModelLeft = useMemo(
    () => getImageColorModel(selectedImageLeft),
    [selectedImageLeft],
  );

  const selectedImageColorModelRight = useMemo(
    () => getImageColorModel(selectedImageRight),
    [selectedImageRight],
  );

  const availableICCProfilesLeft = useMemo(
    () =>
      availableICCProfiles.filter(
        (profile) =>
          getProfileColorModel(profile) === selectedImageColorModelLeft,
      ),
    [availableICCProfiles, selectedImageColorModelLeft],
  );

  const availableICCProfilesRight = useMemo(
    () =>
      availableICCProfiles.filter(
        (profile) =>
          getProfileColorModel(profile) === selectedImageColorModelRight,
      ),
    [availableICCProfiles, selectedImageColorModelRight],
  );

  const loadedMonitorProfiles = useMemo(
    () => [emptyMonitorProfileValue, ...availableMonitorProfiles],
    [availableMonitorProfiles],
  );

  const activeSelectedICCProfileNameLeft = useMemo(
    () =>
      availableICCProfilesLeft.some(
        (profile) => profile.label === selectedICCProfileNameLeft,
      )
        ? selectedICCProfileNameLeft
        : "",
    [availableICCProfilesLeft, selectedICCProfileNameLeft],
  );

  const activeSelectedICCProfileNameRight = useMemo(
    () =>
      availableICCProfilesRight.some(
        (profile) => profile.label === selectedICCProfileNameRight,
      )
        ? selectedICCProfileNameRight
        : "",
    [availableICCProfilesRight, selectedICCProfileNameRight],
  );

  return {
    selectedImageLeft,
    selectedImageRight,
    selectedImageColorModelLeft,
    selectedImageColorModelRight,
    availableICCProfilesLeft,
    availableICCProfilesRight,
    loadedMonitorProfiles,
    activeSelectedICCProfileNameLeft,
    activeSelectedICCProfileNameRight,
  };
}
