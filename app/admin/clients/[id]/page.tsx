"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Client {
  id: string;
  name: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
  share_token: string;
}

interface ImportSection {
  title: string;
  description: string;
  endpoint: string;
}

const importSections: ImportSection[] = [
  {
    title: "アカウントのインサイト",
    description: "Instagramアカウントのインサイトデータ（CSV）をインポートします",
    endpoint: "/api/import/instagram",
  },
  {
    title: "投稿のインサイト",
    description: "Instagram投稿のインサイトデータ（CSV）をインポートします",
    endpoint: "/api/import/instagram-posts",
  },
  {
    title: "タグ付け投稿一覧",
    description: "タグ付けされた投稿のデータ（CSV）をインポートします",
    endpoint: "/api/import/tagged-posts",
  },
  {
    title: "Meta広告データ",
    description: "Meta広告のパフォーマンスデータ（CSV）をインポートします",
    endpoint: "/api/import/meta-ads",
  },
];

interface ImportStatus {
  loading: boolean;
  message: string;
  type: "success" | "error" | "";
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [importStatuses, setImportStatuses] = useState<
    Record<string, ImportStatus>
  >({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>(
    {}
  );

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      }
    } catch (err) {
      console.error("クライアント取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const copyShareLink = () => {
    if (!client) return;
    const url = `${window.location.origin}/dashboard/${client.share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (endpoint: string, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [endpoint]: file }));
  };

  const handleImport = async (section: ImportSection) => {
    const file = selectedFiles[section.endpoint];
    if (!file) return;

    setImportStatuses((prev) => ({
      ...prev,
      [section.endpoint]: { loading: true, message: "", type: "" },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", clientId);

      const res = await fetch(section.endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setImportStatuses((prev) => ({
          ...prev,
          [section.endpoint]: {
            loading: false,
            message: `${data.count ?? 0}件のデータをインポートしました`,
            type: "success",
          },
        }));
        setSelectedFiles((prev) => ({ ...prev, [section.endpoint]: null }));
        // Reset file input
        const input = document.getElementById(
          `file-${section.endpoint}`
        ) as HTMLInputElement;
        if (input) input.value = "";
      } else {
        setImportStatuses((prev) => ({
          ...prev,
          [section.endpoint]: {
            loading: false,
            message: data.error || "インポートに失敗しました",
            type: "error",
          },
        }));
      }
    } catch {
      setImportStatuses((prev) => ({
        ...prev,
        [section.endpoint]: {
          loading: false,
          message: "インポート中にエラーが発生しました",
          type: "error",
        },
      }));
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">読み込み中...</div>;
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-gray-500">
        クライアントが見つかりません
      </div>
    );
  }

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/${client.share_token}`;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        &larr; クライアント一覧に戻る
      </Link>

      {/* Client Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Instagram ID:</span>{" "}
                <span className="font-mono">{client.instagram_account_id}</span>
              </p>
              <p>
                <span className="font-medium">広告アカウント ID:</span>{" "}
                <span className="font-mono">{client.meta_ad_account_id}</span>
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            ID: {client.id}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium whitespace-nowrap">
            共有リンク:
          </Label>
          <Input
            readOnly
            value={shareUrl}
            className="font-mono text-sm flex-1"
          />
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            {copied ? "コピー済み" : "コピー"}
          </Button>
        </div>
      </div>

      {/* CSV Import Sections */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        データインポート
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {importSections.map((section) => {
          const status = importStatuses[section.endpoint];
          const file = selectedFiles[section.endpoint];

          return (
            <Card key={section.endpoint}>
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    id={`file-${section.endpoint}`}
                    type="file"
                    accept=".csv"
                    onChange={(e) =>
                      handleFileChange(
                        section.endpoint,
                        e.target.files?.[0] ?? null
                      )
                    }
                    className="cursor-pointer"
                  />
                </div>
                <Button
                  onClick={() => handleImport(section)}
                  disabled={!file || status?.loading}
                  className="w-full"
                >
                  {status?.loading ? "インポート中..." : "インポート"}
                </Button>
                {status?.message && (
                  <div
                    className={`text-sm p-3 rounded-md ${
                      status.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {status.message}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
