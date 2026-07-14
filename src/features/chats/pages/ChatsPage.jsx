/**
 * Chats — Attendant Chats page
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
import { Card } from "../../../components/ui";
import { BottomNav } from "../../../components/layout/BottomNav";

export function Chats() {
  const nav = useNavigate();
  const att = storage.load("session", {});
  const hubId = att?.hubId || "";
  const [activeUserId, setActiveUserId] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadAllChats = () => {
    if (!hubId) return [];
    const all = chatStore.load(hubId);
    const byUser = {};
    all.forEach((m) => {
      if (!byUser[m.userId])
        byUser[m.userId] = {
          userId: m.userId,
          userName: m.userName || "User",
          messages: [],
          unread: 0,
        };
      byUser[m.userId].messages.push(m);
      if (m.from === "user" && !m.attendantRead) byUser[m.userId].unread++;
    });
    return Object.values(byUser).sort((a, b) => {
      const la = a.messages[a.messages.length - 1]?.sentAt || "";
      const lb = b.messages[b.messages.length - 1]?.sentAt || "";
      return lb.localeCompare(la);
    });
  };

  const [conversations, setConversations] = useState(loadAllChats);
  useEffect(() => {
    const iv = setInterval(() => setConversations(loadAllChats()), 3000);
    return () => clearInterval(iv);
  }, [hubId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeUserId, conversations]);

  const openConvo = (userId) => {
    setActiveUserId(userId);
    if (!hubId) return;
    const all = chatStore.load(hubId);
    chatStore.save(
      hubId,
      all.map((m) =>
        m.userId === userId && m.from === "user"
          ? { ...m, attendantRead: true }
          : m,
      ),
    );
    // Mark attendant notifs for this user as read
    if (att?.id) {
      const notifs = attNotifStore.load(att.id);
      const marked = notifs.map((n) =>
        n.userId === userId ? { ...n, isRead: true } : n,
      );
      Cookies.set(`slashit_attendant_notifs_${att.id}`, JSON.stringify(marked));
    }
    setConversations(loadAllChats());
  };

  const sendReply = async () => {
    if (!reply.trim() || sending || !activeUserId) return;
    const text = reply.trim();
    setReply("");
    setSending(true);
    const msg = {
      id: "chat-" + Date.now(),
      hubId,
      userId: activeUserId,
      userName:
        conversations.find((c) => c.userId === activeUserId)?.userName ||
        "User",
      from: "attendant",
      fromName: att?.name || "Attendant",
      text,
      sentAt: new Date().toISOString(),
      isRead: false,
      attendantRead: true,
    };
    chatStore.send(hubId, msg);
    adminChatLog.push({
      ...msg,
      hubName: att?.hubName,
      attendantName: att?.name,
    });
    // Push bell notif + message inbox + browser push to user
    try {
      // Bell notification
      const notifKey = "slashit_user_notifications";
      const existing = JSON.parse(Cookies.get(notifKey) || "[]");
      existing.unshift({
        id: "notif-chat-" + Date.now(),
        type: "chat_reply",
        title: "💬 Reply from " + (att?.name?.split(" ")[0] || "Attendant"),
        body: text.length > 80 ? text.slice(0, 80) + "…" : text,
        isRead: false,
        createdAt: new Date().toISOString(),
        hubName: att?.hubName,
      });
      Cookies.set(notifKey, JSON.stringify(existing));
      // Message inbox (shows on Messages page)
      const msgKey = "slashit_user_messages_" + activeUserId;
      const msgs = JSON.parse(Cookies.get(msgKey) || "[]");
      const attFirstName = att?.name?.split(" ")[0] || "Attendant";
      const msgText = `[SlashIt] Hi there 👋\n${attFirstName} from ${att?.hubName || "your hub"} replied:\n"${text}"\n— SlashIt Support`;
      msgs.unshift({
        id: "msg-chat-" + Date.now(),
        type: "chat_reply",
        slashId: "",
        slashName: "Support Chat",
        hubName: att?.hubName || "",
        text: msgText,
        sentAt: new Date().toISOString(),
        isRead: false,
      });
      Cookies.set(msgKey, JSON.stringify(msgs));
    } catch (e) {}
    // Browser push to user
    pushBrowserNotif(
      "💬 Message from " + att?.hubName,
      (att?.name?.split(" ")[0] || "Attendant") + ": " + text.slice(0, 80),
    );
    setConversations(loadAllChats());
    setSending(false);
  };

  const activeConvo = conversations.find((c) => c.userId === activeUserId);
  const activeMessages = activeConvo
    ? [...activeConvo.messages].sort(
        (a, b) => new Date(a.sentAt) - new Date(b.sentAt),
      )
    : [];
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh" }}>
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
          padding: "52px 16px 20px",
        }}
      >
        {activeUserId ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setActiveUserId(null)}
              style={{
                color: "rgba(255,255,255,.8)",
                background: "none",
                fontSize: 22,
              }}
            >
              ←
            </button>
            <div>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>
                {activeConvo?.userName || "User"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                Support Chat · {att?.hubName}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
              Support Chats{" "}
              {totalUnread > 0 && (
                <span
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 12,
                    borderRadius: 20,
                    padding: "2px 8px",
                    marginLeft: 8,
                  }}
                >
                  {totalUnread}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              Messages from your hub members
            </div>
          </div>
        )}
      </div>
      {!activeUserId && (
        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <div style={{ fontWeight: 700, color: "#475569", fontSize: 14 }}>
                No messages yet
              </div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Members at {att?.hubName} will message you here
              </div>
            </div>
          ) : (
            conversations.map((c) => {
              const last = [...c.messages].sort(
                (a, b) => new Date(b.sentAt) - new Date(a.sentAt),
              )[0];
              return (
                <Card
                  key={c.userId}
                  onClick={() => openConvo(c.userId)}
                  style={{
                    padding: "14px 16px",
                    cursor: "pointer",
                    border:
                      c.unread > 0
                        ? "1.5px solid #bfdbfe"
                        : "1.5px solid transparent",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: c.unread > 0 ? "#dbeafe" : "#f1f5f9",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      🧑🏾
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 2,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#1e293b",
                          }}
                        >
                          {c.userName}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>
                          {last?.sentAt
                            ? new Date(last.sentAt).toLocaleTimeString(
                                "en-NG",
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : ""}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: c.unread > 0 ? "#1e293b" : "#94a3b8",
                          fontWeight: c.unread > 0 ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {last?.text || ""}
                      </div>
                    </div>
                    {c.unread > 0 && (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          background: "#2563eb",
                          borderRadius: "50%",
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {c.unread}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
      {activeUserId && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 140px)",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {activeMessages.map((m) => {
              const isMe = m.from === "attendant";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    gap: 8,
                    alignItems: "flex-end",
                  }}
                >
                  {!isMe && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        background: "#dbeafe",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      🧑🏾
                    </div>
                  )}
                  <div style={{ maxWidth: "75%" }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: isMe
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                        background: isMe ? "#2563eb" : "#fff",
                        color: isMe ? "#fff" : "#1e293b",
                        fontSize: 13,
                        lineHeight: 1.5,
                        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        marginTop: 3,
                        textAlign: isMe ? "right" : "left",
                      }}
                    >
                      {new Date(m.sentAt).toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMe && <span style={{ marginLeft: 4 }}>✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div
            style={{
              padding: "12px 16px 16px",
              background: "#fff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder="Type a reply…"
              style={{ flex: 1, borderRadius: 24, padding: "10px 16px" }}
            />
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: reply.trim() ? "#2563eb" : "#e2e8f0",
                color: reply.trim() ? "#fff" : "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                border: "none",
                cursor: "pointer",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
      {!activeUserId && <BottomNav />}
    </div>
  );
}

// Re-export alias
export { Chats as ChatsPage };
