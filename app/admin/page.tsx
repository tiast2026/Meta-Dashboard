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
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  Users,
  ExternalLink,
  Camera,
  Megaphone,
  Link2,
} from "lucide-react";

interface Client {
  client_id: string;
  name: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
  share_token: string;
}

interface ClientForm {
  name: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
}

const emptyForm: ClientForm = {
  name: "",
  instagram_account_id: "",
  meta_ad_account_id: "",
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
      instagram_account_id: client.instagram_account_id,
      meta_ad_account_id: client.meta_ad_account_id,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.client_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("更新に失敗しました");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
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
      if (res.ok) {
        await fetchClients();
      }
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            クライアント管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            クライアントの追加・編集・ダッシュボードリンクの管理
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          新規クライアント
        </Button>
      </div>

      {/* Stats Cards */}
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

      {/* Client List */}
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
                <TableHead className="font-semibold text-gray-700">クライアント名</TableHead>
                <TableHead className="font-semibold text-gray-700">Instagram ID</TableHead>
                <TableHead className="font-semibold text-gray-700">広告アカウント</TableHead>
                <TableHead className="font-semibold text-gray-700">ダッシュボード</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.client_id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <TableCell>
                    <Link
                      href={`/admin/clients/${client.client_id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {client.instagram_account_id || "—"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {client.meta_ad_account_id || "—"}
                    </code>
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
                            <Link2 className="w-3.5 h-3.5 mr-1.5" />
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                クライアント名
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: サンプル株式会社"
                className="h-10"
                required
              />
            </div>
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
                required
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
                required
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
