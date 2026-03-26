import { useEffect, useState } from "react";
import { STORAGE_CHANGE_EVENT } from "@/lib/storage";

/** Bumps when local portfolio storage changes (including demo toggle / import). */
export function useStorageRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((n) => n + 1);
    window.addEventListener(STORAGE_CHANGE_EVENT, bump);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, bump);
  }, []);

  return revision;
}
