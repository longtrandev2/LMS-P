import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime";

interface PresenceSignal {
  user_id: number;
  online: boolean;
}

/** Hook theo dõi trạng thái trực tuyến (online/offline) của người dùng qua WebSocket. */
export function usePresence() {
  const client = useQueryClient();

  const { data: onlineList } = useQuery({
    queryKey: queryKeys.users.onlineIds,
    queryFn: async ({ signal }) => {
      const ids = await api.get<number[]>("/users/online-ids", undefined, signal);
      return Array.isArray(ids) ? ids : [];
    },
    staleTime: 60_000,
  });

  useRealtimeEvents({
    onMessage: (type, data) => {
      if (type === "presence.changed" && data) {
        const signal = data as PresenceSignal;
        if (typeof signal.user_id === "number") {
          client.setQueryData<number[]>(queryKeys.users.onlineIds, (prev = []) => {
            const set = new Set(prev);
            if (signal.online) set.add(signal.user_id);
            else set.delete(signal.user_id);
            return Array.from(set);
          });
        }
      }
    },
    onOpen: () => {
      void client.invalidateQueries({ queryKey: queryKeys.users.onlineIds });
    },
  });

  const onlineSet = useMemo(() => new Set(onlineList ?? []), [onlineList]);

  const isOnline = useCallback(
    (userId?: number | null) => (userId != null ? onlineSet.has(userId) : false),
    [onlineSet]
  );

  return { onlineSet, isOnline };
}