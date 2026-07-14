/**
 * Collections — Attendant Collections page
 * Extracted from App.jsx.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, setToken, getToken, clearToken } from "../../../api";
import { toast } from "../../../toast";
import Cookies from "js-cookie";
import {
  storage,
  chatStore,
  msgStore,
  notifStore,
  adminLog,
  adminChatLog,
  broadcastSlashMessage,
  attNotifStore,
} from "../../../storage";
import { fmt, delay, fromNow } from "../../../data";
import { Btn, Card } from "../../../components/ui";
import { BottomNav } from "../../../components/layout/BottomNav";

export function Collections() {
  const nav = useNavigate();
  const att = storage.load("session", {});
  const filterByHub = (cols) =>
    att?.hubId
      ? cols.filter((c) => !c.hubId || String(c.hubId) === String(att.hubId))
      : cols;
  // Show only active (not fully completed) collections
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const iv = setInterval(() => {
      const all = filterByHub(storage.load("collections", MOCK_COLLECTIONS));
      setCollections(
        all.filter((c) => !c.members?.every((m) => m.status === "collected")),
      );
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const saveAll = (updated) => {
    const full = storage.load("collections", []);
    const ids = new Set(updated.map((c) => c.slashId));
    const merged = [...updated, ...full.filter((c) => !ids.has(c.slashId))];
    Cookies.set("slashit_attendant_collections", JSON.stringify(merged));
    setCollections(
      updated.filter((c) => !c.members?.every((m) => m.status === "collected")),
    );
  };

  const markCollected = async (slashId, userId) => {
    await delay(400);
    const full = storage.load("collections", []);
    const updated = full.map((c) => {
      if (c.slashId !== slashId) return c;
      const members = c.members.map((m) =>
        m.userId === userId
          ? { ...m, status: "collected", collectedAt: new Date().toISOString() }
          : m,
      );
      return {
        ...c,
        members,
        collectedCount: members.filter((m) => m.status === "collected").length,
      };
    });
    Cookies.set("slashit_attendant_collections", JSON.stringify(updated));
    const col = updated.find((c) => c.slashId === slashId);
    if (col && col.members.every((m) => m.status === "collected")) {
      const now = new Date().toISOString();
      // Mark slash as completed in user slashes
      try {
        const userSlashes = JSON.parse(
          Cookies.get("slashit_user_slashes") || "[]",
        );
        Cookies.set(
          "slashit_user_slashes",
          JSON.stringify(
            userSlashes.map((s) =>
              String(s.id) === String(slashId)
                ? { ...s, status: "completed", completedAt: now }
                : s,
            ),
          ),
        );
      } catch (e) {}
      // Mark delivery as completed — moves it to history tab
      try {
        const rawDels = Cookies.get("slashit_attendant_deliveries");
        const allDels = rawDels
          ? JSON.parse(rawDels)
          : storage.load("deliveries", MOCK_DELIVERIES);
        const updatedDels = allDels.map((d) =>
          String(d.slashId) === String(slashId)
            ? {
                ...d,
                status: "completed",
                completedAt: now,
                collectedCount: col.members.length,
                memberCount: col.members.length,
              }
            : d,
        );
        Cookies.set(
          "slashit_attendant_deliveries",
          JSON.stringify(updatedDels),
        );
        storage.save("deliveries", updatedDels);
      } catch (e) {}
      // Broadcast completed messages + browser push
      col.members.forEach((member) => {
        const text = `[SlashIt] Hi ${member.name.split(" ")[0]}! 🎉\nYour "${col.productName}" slash is complete. Thanks for slashing with us!\nSee you on the next one ⚡ — SlashIt`;
        msgStore.push(member.userId, {
          id: `msg-done-${Date.now()}-${member.userId}`,
          type: "completed",
          slashId: col.slashId,
          slashName: col.productName,
          hubName: att?.hubName || col.hubName,
          text,
          sentAt: now,
          isRead: false,
        });
        notifStore.push(member.userId, {
          id: `notif-done-${Date.now()}-${member.userId}`,
          type: "completed",
          title: "🎉 Slash Complete!",
          body: `Your ${col.productName} slash is done. All members collected.`,
          isRead: false,
          createdAt: now,
          slashId: col.slashId,
        });
        pushBrowserNotif(
          "🎉 Slash Complete!",
          `Your ${col.productName} slash is done. Thanks for slashing!`,
        );
      });
      adminLog.push({
        id: `log-done-${Date.now()}`,
        hubId: att?.hubId || col.hubId,
        hubName: att?.hubName || col.hubName,
        attendantName: att?.name || "Attendant",
        slashId: col.slashId,
        slashName: col.productName,
        type: "completed",
        membersNotified: col.members.length,
        totalMembers: col.members.length,
        sentAt: now,
      });
      toast.success("🎉 All members collected! Slash completed.");
    } else {
      toast.success("Marked as collected ✓");
    }
    setCollections(
      filterByHub(updated).filter(
        (c) => !c.members?.every((m) => m.status === "collected"),
      ),
    );
  };

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
          padding: "52px 16px 20px",
        }}
      >
        <button
          onClick={() => nav(-1)}
          style={{
            color: "rgba(255,255,255,.8)",
            background: "none",
            fontSize: 22,
            marginBottom: 8,
          }}
        >
          ←
        </button>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
          Collections
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
          Track member pickup progress
        </div>
      </div>
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {collections.map((col) => {
          const pct = Math.round((col.collectedCount / col.totalSlots) * 100);
          const pending = col.totalSlots - col.collectedCount;
          return (
            <Card key={col.slashId}>
              <div style={{ padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      background: "#eff6ff",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {col.productEmoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#1e293b",
                      }}
                    >
                      {col.productName}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Slash #{col.slashId}
                    </div>
                  </div>
                  <div
                    style={{ fontWeight: 900, color: "#1d4ed8", fontSize: 18 }}
                  >
                    {pct}%
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {col.members.map((m) => (
                    <div
                      key={m.userId}
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        background:
                          m.status === "collected" ? "#2563eb" : "#e2e8f0",
                        transition: "background .3s",
                      }}
                      title={m.name}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  <span>
                    <b style={{ color: "#1e293b" }}>{col.collectedCount}</b>{" "}
                    collected
                  </span>
                  <span>
                    <b style={{ color: "#d97706" }}>{pending}</b> pending
                  </span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {col.members.map((m) => (
                    <div
                      key={m.userId}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background:
                          m.status === "collected" ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${m.status === "collected" ? "#bbf7d0" : "#e2e8f0"}`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background:
                            m.status === "collected" ? "#dcfce7" : "#eff6ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            m.status === "collected" ? "#16a34a" : "#1d4ed8",
                          flexShrink: 0,
                        }}
                      >
                        #{m.slotNumber}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            color: "#1e293b",
                          }}
                        >
                          {m.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>
                          {m.status === "collected"
                            ? "Collected " + fromNow(m.collectedAt)
                            : m.phone}
                        </div>
                      </div>
                      {m.status === "collected" ? (
                        <span
                          style={{
                            color: "#16a34a",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          ✓
                        </span>
                      ) : (
                        <Btn
                          size="sm"
                          variant="success"
                          onClick={() => markCollected(col.slashId, m.userId)}
                        >
                          Mark ✓
                        </Btn>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
        {collections.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 600 }}>No active collections</div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#94a3b8" }}>
              Collections appear here when slashes fill up
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

// Re-export alias
export { Collections as CollectionsPage };
