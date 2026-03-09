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
  const normalizedKey = ablyKey?.trim();

  if (!normalizedKey) {
    throw new Error("Missing Ably key");
  }

  const client = new Ably.Realtime({
    key: normalizedKey,
    clientId: `anon-${Math.random().toString(36).slice(2, 10)}`,
  });

  const channel = client.channels.get(`collab:${roomId}`);

  let isClosed = false;
  let isReady = false;

  let updateTimeout: ReturnType<typeof setTimeout> | null = null;
  let awarenessTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdates: Uint8Array[] = [];

  client.connection.on((stateChange) => {
    console.log("[ably connection]", {
      current: stateChange.current,
      previous: stateChange.previous,
      reason: stateChange.reason,
    });
  });

  channel.on((stateChange: any) => {
    console.log("[ably channel]", {
      current: stateChange.current,
      previous: stateChange.previous,
      reason: stateChange.reason,
    });
  });

  const waitForConnected = () =>
    new Promise<void>((resolve, reject) => {
      if (client.connection.state === "connected") {
        resolve();
        return;
      }

      const onConnected = () => {
        cleanup();
        resolve();
      };

      const onFailed = (stateChange: any) => {
        cleanup();
        reject(stateChange?.reason || new Error("Ably connection failed"));
      };

      const cleanup = () => {
        client.connection.off("connected", onConnected as any);
        client.connection.off("failed", onFailed as any);
      };

      client.connection.on("connected", onConnected as any);
      client.connection.on("failed", onFailed as any);
    });

  const safePublish = async (name: string, data: any) => {
    if (isClosed || !isReady) return;
    try {
      await channel.publish(name, data);
    } catch (error) {
      if (!isClosed) {
        console.warn(`Failed to publish ${name}:`, error);
      }
    }
  };

  const handleDocUpdate = (_update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || isClosed || !isReady) return;

    pendingUpdates.push(_update);

    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      if (pendingUpdates.length === 0 || isClosed || !isReady) return;

      const merged = Y.encodeStateAsUpdate(ydoc);
      void safePublish("yjs-update", encodeUpdate(merged));
      pendingUpdates = [];
    }, 30);
  };

  const handleRemoteUpdate = (message: { data: string }) => {
    if (!message?.data || isClosed) return;

    try {
      const update = decodeUpdate(String(message.data));
      Y.applyUpdate(ydoc, update, "remote");
    } catch (error) {
      console.warn("Failed to apply remote Yjs update:", error);
    }
  };

  const handleSyncRequest = (message?: { data?: { clientId?: string } }) => {
    if (isClosed || !isReady) return;
    if (message?.data?.clientId === client.clientId) return;

    const fullUpdate = Y.encodeStateAsUpdate(ydoc);
    void safePublish("yjs-sync", encodeUpdate(fullUpdate));
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
      }
    } catch (error) {
      console.warn("Failed to hydrate collaboration history:", error);
    }
  };

  const handleAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    if (isClosed || !isReady) return;

    if (awarenessTimeout) clearTimeout(awarenessTimeout);
    awarenessTimeout = setTimeout(() => {
      const changed = added.concat(updated, removed);
      if (changed.length === 0 || isClosed || !isReady) return;

      try {
        const update = encodeAwarenessUpdate(awareness, changed);
        void safePublish("yjs-awareness", encodeUpdate(update));
      } catch (error) {
        console.warn("Failed to encode awareness update:", error);
      }
    }, 20);
  };

  const handleRemoteAwareness = (message: { data: string }) => {
    if (!message?.data || isClosed) return;

    try {
      const update = decodeUpdate(String(message.data));
      applyAwarenessUpdate(awareness, update, "remote");
    } catch (error) {
      console.warn("Failed to apply remote awareness update:", error);
    }
  };

  const setup = async () => {
    try {
      await waitForConnected();
      if (isClosed) return;

      channel.subscribe("yjs-update", handleRemoteUpdate as any);
      channel.subscribe("yjs-sync", handleRemoteUpdate as any);
      channel.subscribe("yjs-request-sync", handleSyncRequest as any);
      channel.subscribe("yjs-awareness", handleRemoteAwareness as any);

      await channel.attach();
      if (isClosed) return;

      isReady = true;

      ydoc.on("update", handleDocUpdate);
      awareness.on("update", handleAwarenessUpdate);

      await hydrateFromHistory();
      await safePublish("yjs-request-sync", { clientId: client.clientId });

      console.log("[collab transport ready]", {
        roomId,
        clientId: client.clientId,
      });
    } catch (error) {
      console.warn("Failed to initialize collaboration transport:", error);
    }
  };

  void setup();

  return () => {
    if (isClosed) return;
    isClosed = true;
    isReady = false;

    if (updateTimeout) clearTimeout(updateTimeout);
    if (awarenessTimeout) clearTimeout(awarenessTimeout);
    pendingUpdates = [];

    try {
      awareness.setLocalState(null);
    } catch {}

    try {
      channel.unsubscribe("yjs-update", handleRemoteUpdate as any);
      channel.unsubscribe("yjs-sync", handleRemoteUpdate as any);
      channel.unsubscribe("yjs-request-sync", handleSyncRequest as any);
      channel.unsubscribe("yjs-awareness", handleRemoteAwareness as any);
    } catch {}

    try {
      ydoc.off("update", handleDocUpdate);
      awareness.off("update", handleAwarenessUpdate);
    } catch {}

    try {
      if (
        client.connection.state !== "closed" &&
        client.connection.state !== "closing"
      ) {
        client.close();
      }
    } catch {}
  };
}
