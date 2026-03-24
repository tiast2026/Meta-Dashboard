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
      console.error("\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u53D6\u5F97\u30A8\u30E9\u30FC:", err);
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
        if (!res.ok) throw new Error("\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
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
    if (!confirm("\u3053\u306E\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u3092\u524A\u9664\u3057\u3066\u3082\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F")) return;

    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchClients();
      }
    } catch (err) {
      console.error("\u524A\u9664\u30A8\u30E9\u30FC:", err);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u7BA1\u7406</h2>
          <p className="text-sm text-gray-500 mt-1">
            \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u306E\u8FFD\u52A0\u30FB\u7DE8\u96C6\u30FB\u524A\u9664\u3092\u884C\u3044\u307E\u3059
          </p>
        </div>
        <Button onClick={openCreateDialog}>\u65B0\u898F\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u304C\u307E\u3060\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>\u540D\u524D</TableHead>
                <TableHead>IG Account</TableHead>
                <TableHead>Ad Account</TableHead>
                <TableHead>\u5171\u6709\u30EA\u30F3\u30AF</TableHead>
                <TableHead className="text-right">\u64CD\u4F5C</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.client_id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/clients/${client.client_id}`}
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
                      {copiedId === client.client_id ? (
                        <Badge variant="secondary">\u30B3\u30D4\u30FC\u6E08\u307F</Badge>
                      ) : (
                        "\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC"
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                    >
                      \u7DE8\u96C6
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(client.client_id)}
                    >
                      \u524A\u9664
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
              {editingClient ? "\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u7DE8\u96C6" : "\u65B0\u898F\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u4F5C\u6210"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u60C5\u5831\u3092\u66F4\u65B0\u3057\u307E\u3059"
                : "\u65B0\u3057\u3044\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u3092\u767B\u9332\u3057\u307E\u3059"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u540D</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="\u4F8B: \u30B5\u30F3\u30D7\u30EB\u682A\u5F0F\u4F1A\u793E"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_account_id">Instagram \u30A2\u30AB\u30A6\u30F3\u30C8 ID</Label>
              <Input
                id="instagram_account_id"
                value={form.instagram_account_id}
                onChange={(e) =>
                  setForm({ ...form, instagram_account_id: e.target.value })
                }
                placeholder="\u4F8B: 17841400000000000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta_ad_account_id">Meta \u5E83\u544A\u30A2\u30AB\u30A6\u30F3\u30C8 ID</Label>
              <Input
                id="meta_ad_account_id"
                value={form.meta_ad_account_id}
                onChange={(e) =>
                  setForm({ ...form, meta_ad_account_id: e.target.value })
                }
                placeholder="\u4F8B: act_123456789"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                \u30AD\u30E3\u30F3\u30BB\u30EB
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "\u4FDD\u5B58\u4E2D..."
                  : editingClient
                  ? "\u66F4\u65B0\u3059\u308B"
                  : "\u4F5C\u6210\u3059\u308B"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
