import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Bell, BellRinging, Circle } from "@phosphor-icons/react";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/notifications/mine");
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {}
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const openBell = async (o) => {
    setOpen(o);
    if (o && unread > 0) {
      await api.post("/notifications/read-all").catch(() => {});
      setUnread(0);
    }
  };

  const goTo = (n) => {
    setOpen(false);
    if (n.link) nav(n.link);
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={openBell}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notif-bell"
          className="relative w-9 h-9 flex items-center justify-center hover:bg-neutral-100 transition-colors"
          aria-label="Notificações"
        >
          {unread > 0 ? (
            <BellRinging weight="fill" size={20} className="text-[hsl(210,100%,22%)]" />
          ) : (
            <Bell size={20} />
          )}
          {unread > 0 && (
            <span
              data-testid="notif-badge"
              className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[hsl(180,90%,45%)] text-[hsl(210,100%,15%)] text-[10px] font-bold flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-sm">Notificações</span>
          <button
            data-testid="notif-mark-read"
            className="text-xs text-muted-foreground hover:text-[hsl(210,100%,22%)]"
            onClick={async () => { await api.post("/notifications/read-all"); load(); }}
          >
            Marcar todas como lidas
          </button>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Sem notificações ainda.</div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              data-testid={`notif-${n.id}`}
              onClick={() => goTo(n)}
              className={`w-full text-left p-3 border-b border-border hover:bg-neutral-50 flex gap-2 items-start ${!n.read ? "bg-sky-50" : ""}`}
            >
              {!n.read && <Circle weight="fill" size={8} className="text-[hsl(180,90%,45%)] mt-1.5 shrink-0" />}
              <div className="flex-1">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)} atrás</p>
              </div>
            </button>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
