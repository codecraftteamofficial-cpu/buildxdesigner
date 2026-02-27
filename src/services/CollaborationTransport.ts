import * as Y from "yjs";
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
} from "y-protocols/awareness";
import Ably from "ably";

const encodeUpdate = (update: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(update)));

const decodeUpdate = (data: string) =>
  Uint8Array.from(atob(data), (char) => char.charCodeAt(0));

export function initializeCollaborationTransport(
  ydoc: Y.Doc,
  awareness: Awareness,
  roomId: string,
  ablyKey: string,
): () => void {
  const client = new Ably.Realtime({
    key: ablyKey,
    clientId: `anon-${Math.random().toString(36).slice(2, 10)}`,
  });
  const channel = client.channels.get(`collab:${roomId}`);

  let updateTimeout: NodeJS.Timeout | null = null;
  let pendingUpdates: Uint8Array[] = [];

  const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return;
    pendingUpdates.push(update);
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      if (pendingUpdates.length > 0) {
        const merged = Y.encodeStateAsUpdate(ydoc);
        channel.publish("yjs-update", encodeUpdate(merged));
        pendingUpdates = [];
      }
    }, 30);
  };

  const handleRemoteUpdate = (message: { data: string }) => {
    if (!message?.data) return;
    const update = decodeUpdate(String(message.data));
    Y.applyUpdate(ydoc, update, "remote");
  };

  const handleSyncRequest = (message?: { data?: { clientId?: string } }) => {
    if (message?.data?.clientId === client.clientId) return;
    const yComponents = ydoc.getArray("components");
    if (yComponents.length === 0) return;
    const fullUpdate = Y.encodeStateAsUpdate(ydoc);
    channel.publish("yjs-sync", encodeUpdate(fullUpdate));
  };

  const hydrateFromHistory = async () => {
    try {
      const history = await channel.history({ limit: 50 });
      const messages = history.items ?? [];

      for (const message of messages) {
        if (message.name !== "yjs-update" && message.name !== "yjs-sync") {
          continue;
        }
        if (!message.data || typeof message.data !== "string") {
          continue;
        }

        const update = decodeUpdate(message.data);
        Y.applyUpdate(ydoc, update, "remote");

        const yComponents = ydoc.getArray("components");
        if (yComponents.length > 0) {
          break;
        }
      }
    } catch (error) {
      console.warn("Failed to hydrate collaboration history:", error);
    }
  };

  let awarenessTimeout: NodeJS.Timeout | null = null;

  const handleAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    if (awarenessTimeout) clearTimeout(awarenessTimeout);
    awarenessTimeout = setTimeout(() => {
      const changed = added.concat(updated, removed);
      if (changed.length > 0) {
        const update = encodeAwarenessUpdate(awareness, changed);
        channel.publish("yjs-awareness", encodeUpdate(update));
      }
    }, 20);
  };

  const handleRemoteAwareness = (message: { data: string }) => {
    if (!message?.data) return;
    const update = decodeUpdate(String(message.data));
    applyAwarenessUpdate(awareness, update, "remote");
  };

  ydoc.on("update", handleDocUpdate);
  awareness.on("update", handleAwarenessUpdate);

  channel.subscribe("yjs-update", handleRemoteUpdate as any);
  channel.subscribe("yjs-sync", handleRemoteUpdate as any);
  channel.subscribe("yjs-request-sync", handleSyncRequest as any);
  channel.subscribe("yjs-awareness", handleRemoteAwareness as any);

  hydrateFromHistory().finally(() => {
    channel.publish("yjs-request-sync", { clientId: client.clientId });
  });

  return () => {
    if (updateTimeout) clearTimeout(updateTimeout);
    pendingUpdates = [];
    if (awarenessTimeout) clearTimeout(awarenessTimeout);
    channel.unsubscribe("yjs-update", handleRemoteUpdate as any);
    channel.unsubscribe("yjs-sync", handleRemoteUpdate as any);
    channel.unsubscribe("yjs-request-sync", handleSyncRequest as any);
    channel.unsubscribe("yjs-awareness", handleRemoteAwareness as any);
    ydoc.off("update", handleDocUpdate);
    awareness.off("update", handleAwarenessUpdate);

    const state = client.connection.state;
    if (state !== "closed" && state !== "closing" && state !== "failed") {
      try {
        client.close();
      } catch {}
    }
  };
}
