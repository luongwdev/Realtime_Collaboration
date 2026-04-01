"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { api, ApiError, type WorkspaceRole } from "@/lib/api";
import { clearSession, getStoredAccessToken } from "@/lib/session";
import { toastError, toastSuccess } from "@/lib/toast";

type Workspace = { id: string; name: string };
type Channel = { id: string; name: string; type: string };
type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
};
type Task = {
  id: string;
  title: string;
  status: string;
  assigneeId: string | null;
};
type Doc = { id: string; title: string; version: number };

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [token, setToken] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [profile, setProfile] = useState<{ email: string; id: string } | null>(
    null,
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; type: string; isRead: boolean; createdAt: string }>
  >([]);
  const [newWorkspace, setNewWorkspace] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newDoc, setNewDoc] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [currentRole, setCurrentRole] = useState<WorkspaceRole | null>(null);

  const stats = useMemo(
    () => [
      { label: t("dashboard.workspace"), value: workspaces.length },
      { label: t("dashboard.channel"), value: channels.length },
      { label: t("dashboard.tasks"), value: tasks.length },
      { label: t("dashboard.unread"), value: notifications.filter((n) => !n.isRead).length },
    ],
    [channels.length, notifications, t, tasks.length, workspaces.length],
  );

  async function loadWorkspaces(accessToken = token, userId = currentUserId) {
    if (!accessToken) return;
    const ws = await api.workspaces(accessToken);
    setWorkspaces(ws.data);
    if (!selectedWorkspace && ws.data.length > 0) {
      const first = ws.data[0].id;
      setSelectedWorkspace(first);
      await loadWorkspaceDetail(first, accessToken, userId);
    }
  }

  async function loadWorkspaceDetail(
    workspaceId: string,
    accessToken = token,
    userId = currentUserId,
  ) {
    if (!accessToken) return;
    const [c, t, d, members] = await Promise.all([
      api.channels(accessToken, workspaceId),
      api.tasks(accessToken, workspaceId),
      api.documents(accessToken, workspaceId),
      api.workspaceMembers(accessToken, workspaceId),
    ]);
    setChannels(c.data);
    setTasks(t.data);
    setDocs(d.data);
    const me = members.data.find((m) => m.user.id === userId);
    setCurrentRole(me?.role ?? null);
    if (!selectedChannel && c.data.length > 0) {
      const firstChannel = c.data[0].id;
      setSelectedChannel(firstChannel);
      const m = await api.messages(accessToken, firstChannel);
      setMessages(m.data);
    } else if (selectedChannel) {
      const m = await api.messages(accessToken, selectedChannel);
      setMessages(m.data);
    }
  }

  async function loadNotifications(accessToken = token) {
    if (!accessToken) return;
    const noti = await api.notifications(accessToken);
    setNotifications(noti.data);
  }

  async function bootstrap(accessToken: string) {
    try {
      const me = await api.me(accessToken);
      const meData = me.data as { id: string; email: string };
      setProfile(meData);
      setCurrentUserId(meData.id);
      await Promise.all([loadWorkspaces(accessToken, meData.id), loadNotifications(accessToken)]);
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.statusCode === 401 || e.statusCode === 403)
      ) {
        clearSession();
        router.replace("/auth");
        return;
      }
      setMessage(
        e instanceof Error ? e.message : t("dashboard.loadDashboardFail"),
      );
      toastError(
        e instanceof Error ? e.message : t("dashboard.loadDashboardFail"),
      );
    }
  }

  useEffect(() => {
    const savedToken = getStoredAccessToken();
    if (!savedToken) {
      router.replace("/auth");
      return;
    }
    setToken(savedToken);
    void bootstrap(savedToken);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/auth");
  }

  async function createWorkspace() {
    if (!newWorkspace.trim()) {
      toastError(t("dashboard.emptyWorkspace"));
      return;
    }
    if (!token) return;
    await api.createWorkspace(token, newWorkspace.trim());
    setNewWorkspace("");
    await loadWorkspaces();
    toastSuccess(t("dashboard.workspaceCreated"));
  }

  async function createChannel() {
    if (!newChannel.trim()) {
      toastError(t("dashboard.emptyChannel"));
      return;
    }
    if (!selectedWorkspace) {
      toastError(t("dashboard.selectWorkspace"));
      return;
    }
    if (currentRole === "MEMBER") {
      toastError("Members cannot create channels.");
      return;
    }
    if (!token) return;
    await api.createChannel(token, selectedWorkspace, {
      name: newChannel.trim(),
    });
    setNewChannel("");
    await loadWorkspaceDetail(selectedWorkspace);
    toastSuccess(t("dashboard.channelCreated"));
  }

  async function createTask() {
    if (!newTask.trim()) {
      toastError(t("dashboard.emptyTask"));
      return;
    }
    if (!selectedWorkspace) {
      toastError(t("dashboard.selectWorkspace"));
      return;
    }
    if (!token) return;
    await api.createTask(token, selectedWorkspace, { title: newTask.trim() });
    setNewTask("");
    await loadWorkspaceDetail(selectedWorkspace);
    toastSuccess(t("dashboard.taskCreated"));
  }

  async function createDocument() {
    if (!newDoc.trim()) {
      toastError(t("dashboard.emptyDocument"));
      return;
    }
    if (!selectedWorkspace) {
      toastError(t("dashboard.selectWorkspace"));
      return;
    }
    if (!token) return;
    await api.createDocument(token, selectedWorkspace, {
      title: newDoc.trim(),
      content: "",
    });
    setNewDoc("");
    await loadWorkspaceDetail(selectedWorkspace);
    toastSuccess(t("dashboard.documentCreated"));
  }

  async function summarizeChat() {
    if (!selectedChannel) {
      toastError(t("dashboard.selectChannel"));
      return;
    }
    if (!token) return;
    setMessage("");
    try {
      const res = await api.summarizeChat(token, selectedChannel);
      setAiResult(res.data.summary);
      toastSuccess(t("dashboard.summarized"));
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : t("dashboard.summarizeFail"),
      );
      toastError(
        e instanceof Error ? e.message : t("dashboard.summarizeFail"),
      );
    }
  }

  async function suggestReply() {
    if (!aiInput.trim()) {
      toastError(t("dashboard.emptyAiInput"));
      return;
    }
    if (!token || isAskingAi) return;
    setMessage("");
    setIsAskingAi(true);
    try {
      const res = await api.suggestReply(token, aiInput.trim());
      setAiResult(res.data.suggestion);
      toastSuccess(t("dashboard.aiAnswered"));
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : t("dashboard.suggestFail"),
      );
      toastError(
        e instanceof Error ? e.message : t("dashboard.suggestFail"),
      );
    } finally {
      setIsAskingAi(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
              TeamFlow
            </p>
            <h1 className="text-xl font-semibold">{t("dashboard.title")}</h1>
            {currentRole && (
              <p className="mt-1 text-xs text-slate-500">
                Role:{" "}
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    currentRole === "OWNER"
                      ? "bg-amber-100 text-amber-800"
                      : currentRole === "ADMIN"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {currentRole}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-slate-600">{profile?.email}</span>
            <button
              onClick={logout}
              className="ui-btn rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 grid gap-4 lg:grid-cols-[280px_1fr_360px]">
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{t("dashboard.workspace")}</p>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full rounded-lg border px-2 py-1.5 text-sm"
                value={newWorkspace}
                onChange={(e) => setNewWorkspace(e.target.value)}
                placeholder={t("dashboard.workspacePlaceholder")}
              />
              <button
                className="ui-btn rounded-lg bg-slate-900 text-white px-2 text-sm hover:bg-slate-800"
                onClick={createWorkspace}
              >
                +
              </button>
            </div>
            <div className="mt-3 space-y-1">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setSelectedWorkspace(w.id);
                    setSelectedChannel("");
                    void loadWorkspaceDetail(w.id);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    selectedWorkspace === w.id
                      ? "ui-btn bg-cyan-50 text-cyan-800"
                      : "ui-btn hover:bg-slate-50"
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold">{t("dashboard.overview")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t("dashboard.channels")}</p>
              <div className="flex gap-2">
                <input
                  className="rounded-lg border px-2 py-1.5 text-sm"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder={t("dashboard.channelPlaceholder")}
                />
                <button
                  onClick={createChannel}
                  disabled={currentRole === "MEMBER"}
                  className="ui-btn rounded-lg bg-slate-900 text-white px-3 text-sm hover:bg-slate-800"
                >
                  {t("common.add")}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {channels.map((c) => (
                <button
                  key={c.id}
                  onClick={async () => {
                    setSelectedChannel(c.id);
                    const res = await api.messages(token, c.id);
                    setMessages(res.data);
                  }}
                  className={`rounded-full px-3 py-1 text-sm ${
                    selectedChannel === c.id
                      ? "ui-btn bg-cyan-600 text-white"
                      : "ui-btn bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  #{c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{t("dashboard.recentMessages")}</p>
            <div className="mt-3 max-h-[280px] overflow-auto space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="rounded-xl border p-3 text-sm">
                  <p className="text-slate-800">{m.content}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t("dashboard.tasks")}</p>
                <button
                  onClick={createTask}
                  className="ui-btn rounded-lg bg-slate-900 text-white px-3 py-1 text-sm hover:bg-slate-800"
                >
                  {t("common.add")}
                </button>
              </div>
              <input
                className="mt-2 w-full rounded-lg border px-2 py-1.5 text-sm"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder={t("dashboard.taskPlaceholder")}
              />
              <div className="mt-3 space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.status}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t("dashboard.documents")}</p>
                <button
                  onClick={createDocument}
                  className="ui-btn rounded-lg bg-slate-900 text-white px-3 py-1 text-sm hover:bg-slate-800"
                >
                  {t("common.add")}
                </button>
              </div>
              <input
                className="mt-2 w-full rounded-lg border px-2 py-1.5 text-sm"
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                placeholder={t("dashboard.documentPlaceholder")}
              />
              <div className="mt-3 space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-slate-500">
                      {t("dashboard.version")} {d.version}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{t("dashboard.aiAssistant")}</p>
            <div className="mt-3 grid gap-2">
              <button
                onClick={summarizeChat}
                className="ui-btn rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500"
              >
                {t("dashboard.summarize")}
              </button>
              <textarea
                className="min-h-[90px] rounded-lg border px-3 py-2 text-sm"
                placeholder={t("dashboard.aiPlaceholder")}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button
                onClick={suggestReply}
                disabled={isAskingAi}
                className="ui-btn rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAskingAi ? t("dashboard.askingAi") : t("dashboard.askAi")}
              </button>
              <div className="rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                {aiResult || t("dashboard.noAiResult")}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t("dashboard.notifications")}</p>
              <button
                onClick={() => void loadNotifications()}
                className="ui-btn rounded-md px-2 py-1 text-sm text-cyan-700 hover:bg-cyan-50"
              >
                {t("common.refresh")}
              </button>
            </div>
            <div className="mt-3 max-h-[340px] overflow-auto space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 text-sm ${n.isRead ? "bg-slate-50" : "bg-cyan-50"}`}
                >
                  <p className="font-medium">{n.type}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {message && <p className="mt-3 text-xs text-red-500">{message}</p>}
          </div>
        </aside>
      </main>
    </div>
  );
}
