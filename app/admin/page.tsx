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

interface Client {
  id: string;
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
        const res = await fetch(`/api/clients/${editingClient.id}`, {
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
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">クライアント管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            クライアントの追加・編集・削除を行います
          </p>
        </div>
        <Button onClick={openCreateDialog}>新規クライアント</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          クライアントがまだ登録されていません
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>IG Account</TableHead>
                <TableHead>Ad Account</TableHead>
                <TableHead>共有リンク</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {client.instagram_account_id}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {client.meta_ad_account_id}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(client)}
                    >
                      {copiedId === client.id ? (
                        <Badge variant="secondary">コピー済み</Badge>
                      ) : (
                        "リンクをコピー"
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                    >
                      編集
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "クライアント編集" : "新規クライアント作成"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "クライアント情報を更新します"
                : "新しいクライアントを登録します"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">クライアント名</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: サンプル株式会社"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_account_id">Instagram アカウント ID</Label>
              <Input
                id="instagram_account_id"
                value={form.instagram_account_id}
                onChange={(e) =>
                  setForm({ ...form, instagram_account_id: e.target.value })
                }
                placeholder="例: 17841400000000000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta_ad_account_id">Meta 広告アカウント ID</Label>
              <Input
                id="meta_ad_account_id"
                value={form.meta_ad_account_id}
                onChange={(e) =>
                  setForm({ ...form, meta_ad_account_id: e.target.value })
                }
                placeholder="例: act_123456789"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
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
