"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Client {
  client_id: string;
  name: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
  share_token: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      }
    } catch (err) {
      console.error("\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u53D6\u5F97\u30A8\u30E9\u30FC:", err);
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>;
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-gray-500">
        \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093
      </div>
    );
  }

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/${client.share_token}`;

  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        &larr; \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u4E00\u89A7\u306B\u623B\u308B
      </Link>

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
                <span className="font-medium">\u5E83\u544A\u30A2\u30AB\u30A6\u30F3\u30C8 ID:</span>{" "}
                <span className="font-mono">{client.meta_ad_account_id}</span>
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            ID: {client.client_id}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium whitespace-nowrap">
            \u5171\u6709\u30EA\u30F3\u30AF:
          </Label>
          <Input
            readOnly
            value={shareUrl}
            className="font-mono text-sm flex-1"
          />
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            {copied ? "\u30B3\u30D4\u30FC\u6E08\u307F" : "\u30B3\u30D4\u30FC"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          \u30C7\u30FC\u30BF\u30BD\u30FC\u30B9
        </h3>
        <p className="text-sm text-gray-600">
          \u30C7\u30FC\u30BF\u306FGAS\uFF08Google Apps Script\uFF09\u7D4C\u7531\u3067BigQuery\u306B\u81EA\u52D5\u53D6\u8FBC\u3055\u308C\u307E\u3059\u3002
          \u624B\u52D5\u30A4\u30F3\u30DD\u30FC\u30C8\u306F\u4E0D\u8981\u3067\u3059\u3002
        </p>
        <div className="mt-4 text-sm text-gray-500 space-y-1">
          <p>\u30FBinstagram_analytics.raw_account_insights\uFF08\u65E5\u6B21\u30A4\u30F3\u30B5\u30A4\u30C8\uFF09</p>
          <p>\u30FBinstagram_analytics.raw_post_insights\uFF08\u6295\u7A3F\u30A4\u30F3\u30B5\u30A4\u30C8\uFF09</p>
          <p>\u30FBinstagram_analytics.raw_tagged_posts\uFF08\u30BF\u30B0\u4ED8\u3051\u6295\u7A3F\uFF09</p>
          <p>\u30FBmeta_ads.raw_ad_insights\uFF08Meta\u5E83\u544A\u30C7\u30FC\u30BF\uFF09</p>
        </div>
      </div>
    </div>
  );
}
