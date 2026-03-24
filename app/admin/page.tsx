"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  Users,
  ExternalLink,
  Camera,
  Megaphone,
  KeyRound,
  Shield,
  AlertTriangle,
  Copy,
} from "lucide-react";

interface Client {
  client_id: string;
  name: string;
  slug: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
  share_token: string;
  has_token?: boolean;
}

interface ClientForm {
  name: string;
  slug: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
  meta_access_token: string;
}

const emptyForm: ClientForm = {
  name: "",
  slug: "",
  instagram_account_id: "",
  meta_ad_account_id: "",
  meta_access_token: "",
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("クライアント取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openCreateDialog = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      slug: client.slug || "",
      instagram_account_id: client.instagram_account_id,
      meta_ad_account_id: client.meta_ad_account_id,
      meta_access_token: "",
    });
    setDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: Record<string, string> = {
        name: form.name,
        slug: form.slug,
        instagram_account_id: form.instagram_account_id,
        meta_ad_account_id: form.meta_ad_account_id,
      };
      if (form.meta_access_token) {
        payload.meta_access_token = form.meta_access_token;
      }

      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.client_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("更新に失敗しました");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("作成に失敗しました");
      }

      setDialogOpen(false);
      setForm(emptyForm);
      setEditingClient(null);
      await fetchClients();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このクライアントを削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) await fetchClients();
    } catch (err) {
      console.error("削除エラー:", err);
    }
  };

  const copyShareLink = (client: Client) => {
    const url = `${window.location.origin}/dashboard/${client.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(client.client_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTokenStatus = (client: Client) => {
    return client.has_token ? "all" : "none";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            クライアント管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            クライアントの追加・編集・ダッシュボードリンクの管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/guide">
            <Button variant="outline" size="sm">
              セットアップガイド
            </Button>
          </Link>
          <Button
            onClick={openCreateDialog}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規クライアント
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              <p className="text-xs text-gray-500">登録クライアント</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
              <Camera className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter((c) => c.instagram_account_id).length}
              </p>
              <p className="text-xs text-gray-500">Instagram連携</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter((c) => c.meta_ad_account_id).length}
              </p>
              <p className="text-xs text-gray-500">Meta広告連携</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium mb-1">
              クライアントがまだ登録されていません
            </p>
            <p className="text-sm text-gray-500 mb-6">
              「新規クライアント」ボタンから最初のクライアントを追加しましょう
            </p>
            <Button
              onClick={openCreateDialog}
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              クライアントを追加
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700">クライアント</TableHead>
                <TableHead className="font-semibold text-gray-700">トークン状態</TableHead>
                <TableHead className="font-semibold text-gray-700">ダッシュボード</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const tokenStatus = getTokenStatus(client);
                return (
                  <TableRow
                    key={client.client_id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell>
                      <Link
                        href={`/admin/clients/${client.client_id}`}
                        className="block group"
                      >
                        <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {client.name}
                        </p>
                        {client.slug && (
                          <p className="text-xs text-gray-400 mt-0.5">{client.slug}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {client.instagram_account_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                              <Camera className="w-3 h-3 text-pink-400" />
                              {client.instagram_account_id}
                            </span>
                          )}
                          {client.meta_ad_account_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                              <Megaphone className="w-3 h-3 text-blue-400" />
                              {client.meta_ad_account_id}
                            </span>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {tokenStatus === "all" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                          <Shield className="w-3 h-3 mr-1" />
                          設定済み
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-500 border border-gray-200 text-[10px]">
                          未設定
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-gray-600 hover:text-indigo-600"
                          onClick={() => copyShareLink(client)}
                        >
                          {copiedId === client.client_id ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                              <span className="text-green-600">コピー済み</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                              リンクをコピー
                            </>
                          )}
                        </Button>
                        <Link
                          href={`/dashboard/${client.share_token}`}
                          target="_blank"
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-indigo-600"
                          onClick={() => openEditDialog(client)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                          onClick={() => handleDelete(client.client_id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingClient ? "クライアント編集" : "新規クライアント作成"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "クライアント情報を更新します"
                : "新しいクライアントを登録します"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  クライアント名
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setForm({
                      ...form,
                      name: newName,
                      slug: form.slug === "" || form.slug === generateSlug(form.name)
                        ? generateSlug(newName)
                        : form.slug,
                    });
                  }}
                  placeholder="例: サンプル株式会社"
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium">
                  ローマ字表記 (URL用)
                </Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  placeholder="例: sample-corp"
                  className="h-10 font-mono text-sm"
                />
                <p className="text-[10px] text-gray-400">
                  英小文字・数字・ハイフンのみ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="instagram_account_id" className="text-sm font-medium">
                  Instagram アカウント ID
                </Label>
                <Input
                  id="instagram_account_id"
                  value={form.instagram_account_id}
                  onChange={(e) =>
                    setForm({ ...form, instagram_account_id: e.target.value })
                  }
                  placeholder="例: 17841400000000000"
                  className="h-10 font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_ad_account_id" className="text-sm font-medium">
                  Meta 広告アカウント ID
                </Label>
                <Input
                  id="meta_ad_account_id"
                  value={form.meta_ad_account_id}
                  onChange={(e) =>
                    setForm({ ...form, meta_ad_account_id: e.target.value })
                  }
                  placeholder="例: act_123456789"
                  className="h-10 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_access_token" className="text-sm font-medium flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                Meta アクセストークン (Instagram / 広告共通)
              </Label>
              <Input
                id="meta_access_token"
                type="password"
                value={form.meta_access_token}
                onChange={(e) =>
                  setForm({ ...form, meta_access_token: e.target.value })
                }
                placeholder={
                  editingClient
                    ? "設定済み（変更する場合のみ入力）"
                    : "トークンを入力"
                }
                className="h-10 font-mono text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting
                  ? "保存中..."
                  : editingClient
                  ? "更新する"
                  : "作成する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
