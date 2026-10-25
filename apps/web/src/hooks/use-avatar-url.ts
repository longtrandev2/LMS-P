import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useAvatarUrl(path?: string | null) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false; let objectUrl: string | null = null;
    setSource(null);
    if (path) void api.download(path).then(({ blob }) => {
      objectUrl = URL.createObjectURL(blob);
      if (disposed) URL.revokeObjectURL(objectUrl);
      else setSource(objectUrl);
    }).catch(() => undefined);
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  return source;
}
