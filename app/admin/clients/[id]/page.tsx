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
  Camera,
  Megaphone,
  KeyRound,
  Upload,
  CheckCircle2,
  XCircle,
  FileUp,
  Tag,
  Wifi,
  WifiOff,
  Clock,
  ArrowLeft,
  Shield,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Infinity,
  Download,
  RefreshCw,
} from "lucide-react";

interface Client {
  client_id: string;
  name: string;
  instagram_account_id: string;
  meta_ad_account_id: string;
  share_token: string;
  has_token: boolean;
}

interface ConnectionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface TokenInfo {
  valid: boolean;
  type?: string;
  expires_at?: string;
  scopes?: string[];
  message?: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectionResults, setConnectionResults] = useState<Record<string, ConnectionResult> | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [exchangeMessage, setExchangeMessage] = useState<{ type: string; text: string } | null>(null);
  const [permanentTokenLoading, setPermanentTokenLoading] = useState(false);
  const [pages, setPages] = useState<{ id: string; name: string }[] | null>(null);
  const [pageSelectOpen, setPageSelectOpen] = useState(false);
  const [permanentMessage, setPermanentMessage] = useState<{ type: string; text: string } | null>(null);
  const [fetchStates, setFetchStates] = useState<Record<string, { loading: boolean; message: string; success: boolean | null }>>({});
  const [fetchAllRunning, setFetchAllRunning] = useState(false);
  const [fetchAllProgress, setFetchAllProgress] = useState(0);
  const [pasteText, setPasteText] = useState("");
  const [pasteState, setPasteState] = useState<{ loading: boolean; message: string; success: boolean | null }>({ loading: false, message: "", success: null });

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) setClient(await res.json());
    } catch (err) {
      console.error("クライアント取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const copyShareLink = () => {
    if (!client) return;
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/${client.share_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionResults(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/test-connection`, { method: "POST" });
      setConnectionResults(await res.json());
    } catch {
      setConnectionResults({ instagram: { success: false, message: "通信エラー" }, meta_ads: { success: false, message: "通信エラー" } });
    } finally {
      setTestingConnection(false);
    }
  };

  const fetchTokenInfo = async () => {
    setLoadingTokenInfo(true);
    setTokenInfo(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/token-info`);
      setTokenInfo(await res.json());
    } catch {
      setTokenInfo(null);
    } finally {
      setLoadingTokenInfo(false);
    }
  };

  const exchangeToken = async () => {
    setExchanging(true);
    setExchangeMessage(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/exchange-token`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setExchangeMessage({ type: "success", text: `${data.message}${data.expires_in_days ? ` (有効期限: ${data.expires_in_days}日)` : ""}` });
        fetchTokenInfo();
      } else {
        setExchangeMessage({ type: "error", text: data.error || "交換に失敗しました" });
      }
    } catch {
      setExchangeMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setExchanging(false);
    }
  };

  const requestPermanentToken = async (pageId?: string) => {
    setPermanentTokenLoading(true);
    setPermanentMessage(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/permanent-token`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_id: pageId }),
      });
      const data = await res.json();
      if (data.requires_page_selection) {
        setPages(data.pages);
        setPageSelectOpen(true);
      } else if (data.success) {
        setPermanentMessage({ type: "success", text: data.message });
        setPages(null);
        setPageSelectOpen(false);
        fetchTokenInfo();
        fetchClient();
      } else {
        setPermanentMessage({ type: "error", text: data.error || data.message });
      }
    } catch {
      setPermanentMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setPermanentTokenLoading(false);
    }
  };

  const fetchAllFromApi = async () => {
    setFetchAllRunning(true);
    setFetchAllProgress(0);
    // Reset all states
    setFetchStates({
      ig_daily: { loading: true, message: "待機中...", success: null },
      ig_posts: { loading: true, message: "待機中...", success: null },
      ig_tagged: { loading: true, message: "待機中...", success: null },
      meta_ads: { loading: true, message: "待機中...", success: null },
    });

    try {
      const evtSource = new EventSource(`/api/import/fetch-all?client_id=${clientId}`);

      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data) as { step: string; status: string; message: string; progress?: number };

        if (data.progress !== undefined) {
          setFetchAllProgress(data.progress);
        }

        const stepKeyMap: Record<string, string> = {
          ig_daily: "ig_daily",
          ig_posts: "ig_posts",
          ig_tagged: "ig_tagged",
          meta_ads: "meta_ads",
        };

        const uiKey = stepKeyMap[data.step];
        if (uiKey) {
          setFetchStates((prev) => ({
            ...prev,
            [uiKey]: {
              loading: data.status === "running",
              message: data.message,
              success: data.status === "done" ? true : data.status === "error" ? false : null,
            },
          }));
        }

        if (data.step === "complete") {
          evtSource.close();
          setFetchAllRunning(false);
          setFetchAllProgress(100);
        }
      };

      evtSource.onerror = () => {
        evtSource.close();
        setFetchAllRunning(false);
      };
    } catch {
      setFetchAllRunning(false);
    }
  };

  const handlePasteImport = async () => {
    if (!pasteText.trim()) return;
    setPasteState({ loading: true, message: "", success: null });
    try {
      const res = await fetch("/api/import/paste/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, text: pasteText }),
      });
      const data = await res.json();
      setPasteState({
        loading: false,
        message: res.ok ? (data.message || "インポート完了") : (data.error || "インポートに失敗しました"),
        success: res.ok,
      });
      if (res.ok) setPasteText("");
    } catch {
      setPasteState({ loading: false, message: "通信エラーが発生しました", success: false });
    }
  };

  const formatExpiry = (expiresAt: string | undefined) => {
    if (!expiresAt) return { text: "不明", color: "text-gray-500", urgent: false };
    if (expiresAt === "never") return { text: "無期限", color: "text-emerald-600", urgent: false };
    const expDate = new Date(expiresAt);
    const diffDays = Math.floor((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `期限切れ (${expDate.toLocaleDateString("ja-JP")})`, color: "text-red-600", urgent: true };
    if (diffDays <= 7) return { text: `残り${diffDays}日 (${expDate.toLocaleDateString("ja-JP")})`, color: "text-red-600", urgent: true };
    if (diffDays <= 30) return { text: `残り${diffDays}日 (${expDate.toLocaleDateString("ja-JP")})`, color: "text-amber-600", urgent: true };
    return { text: `残り${diffDays}日 (${expDate.toLocaleDateString("ja-JP")})`, color: "text-emerald-600", urgent: false };
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!client) return <div className="text-center py-12 text-gray-500">クライアントが見つかりません</div>;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/${client.share_token}`;

  return (
    <div>
      <Link href="/admin" className="text-sm text-gray-500 hover:text-indigo-600 mb-6 inline-flex items-center gap-1.5 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        クライアント一覧に戻る
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            <p className="text-sm text-gray-500 mt-1">クライアントID: {client.client_id}</p>
          </div>
          <div className="flex items-center gap-2">
            {client.has_token ? (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200"><Shield className="w-3 h-3 mr-1" />トークン設定済み</Badge>
            ) : (
              <Badge className="bg-gray-50 text-gray-500 border border-gray-200">トークン未設定</Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-1"><Camera className="w-4 h-4 text-pink-500" /><span className="text-xs font-medium text-gray-500">Instagram アカウント ID</span></div>
            <code className="text-sm font-mono text-gray-800">{client.instagram_account_id || "未設定"}</code>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-1"><Megaphone className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-gray-500">Meta 広告アカウント ID</span></div>
            <code className="text-sm font-mono text-gray-800">{client.meta_ad_account_id || "未設定"}</code>
          </div>
        </div>
        <Separator className="my-4" />
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block"><ExternalLink className="w-3.5 h-3.5 inline mr-1.5" />ダッシュボード共有リンク</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="font-mono text-sm flex-1 bg-gray-50" />
            <Button variant="outline" size="sm" onClick={copyShareLink} className="shrink-0">
              {copied ? (<><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /><span className="text-emerald-600">コピー済み</span></>) : (<><Copy className="w-3.5 h-3.5 mr-1.5" />コピー</>)}
            </Button>
            <Link href={`/dashboard/${client.share_token}`} target="_blank"><Button variant="outline" size="sm"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />開く</Button></Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><KeyRound className="w-5 h-5 text-gray-400" />アクセストークン管理</h3>
            <p className="text-sm text-gray-500 mt-0.5">Instagram / Meta広告共通トークンの管理・有効期限確認・長期トークンへの交換</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTokenInfo} disabled={loadingTokenInfo}>
              {loadingTokenInfo ? (<><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600 mr-1.5" />確認中...</>) : (<><Clock className="w-3.5 h-3.5 mr-1.5" />有効期限を確認</>)}
            </Button>
            <Button variant="outline" size="sm" onClick={testConnection} disabled={testingConnection}>
              {testingConnection ? (<><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600 mr-1.5" />テスト中...</>) : (<><Wifi className="w-3.5 h-3.5 mr-1.5" />接続テスト</>)}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><KeyRound className="w-5 h-5 text-indigo-600" /></div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-sm">Meta アクセストークン</h4>
              <p className="text-xs text-gray-500">Instagram / Meta広告 共通</p>
            </div>
            {client.has_token ? (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0">設定済み</Badge>
            ) : (
              <Badge className="bg-gray-50 text-gray-500 border border-gray-200 text-[10px] px-1.5 py-0">未設定</Badge>
            )}
          </div>

          {connectionResults && (
            <div className="space-y-2 mb-3">
              {connectionResults.instagram && (
                <div className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${connectionResults.instagram.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {connectionResults.instagram.success ? <Wifi className="w-4 h-4 shrink-0 mt-0.5" /> : <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium">Instagram: {connectionResults.instagram.success ? "接続成功" : "接続失敗"}</p>
                    {connectionResults.instagram.data && <p className="text-xs mt-0.5">@{String(connectionResults.instagram.data.username || "")}{connectionResults.instagram.data.followers_count !== undefined && ` / フォロワー: ${Number(connectionResults.instagram.data.followers_count).toLocaleString()}`}</p>}
                    {!connectionResults.instagram.success && <p className="text-xs mt-0.5">{connectionResults.instagram.message}</p>}
                  </div>
                </div>
              )}
              {connectionResults.meta_ads && (
                <div className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${connectionResults.meta_ads.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {connectionResults.meta_ads.success ? <Wifi className="w-4 h-4 shrink-0 mt-0.5" /> : <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium">Meta広告: {connectionResults.meta_ads.success ? "接続成功" : "接続失敗"}</p>
                    {connectionResults.meta_ads.data && <p className="text-xs mt-0.5">{String(connectionResults.meta_ads.data.name || "")}{connectionResults.meta_ads.data.status ? ` / ${String(connectionResults.meta_ads.data.status)}` : ""}{connectionResults.meta_ads.data.currency ? ` (${String(connectionResults.meta_ads.data.currency)})` : ""}</p>}
                    {!connectionResults.meta_ads.success && <p className="text-xs mt-0.5">{connectionResults.meta_ads.message}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {tokenInfo && (
            <div className={`rounded-lg px-3 py-2 mb-3 text-sm ${tokenInfo.valid ? "bg-blue-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-medium text-gray-700">有効期限:</span>
                {tokenInfo.valid ? <span className={formatExpiry(tokenInfo.expires_at).color}>{formatExpiry(tokenInfo.expires_at).text}</span> : <span className="text-red-600">{tokenInfo.message || "無効"}</span>}
              </div>
              {tokenInfo.type && <p className="text-xs text-gray-500 mt-1">タイプ: {tokenInfo.type}</p>}
            </div>
          )}

          {client.has_token && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={exchangeToken} disabled={exchanging}>
                {exchanging ? (<><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1.5" />交換中...</>) : (<><Zap className="w-3.5 h-3.5 mr-1.5" />長期トークンに交換</>)}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => requestPermanentToken()} disabled={permanentTokenLoading}>
                {permanentTokenLoading ? (<><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600 mr-1.5" />処理中...</>) : (<><Infinity className="w-3.5 h-3.5 mr-1.5" />無期限トークンを発行</>)}
              </Button>
            </div>
          )}
        </div>

        {pages && pages.length > 0 && pageSelectOpen && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-2">Facebookページを選択してください</h4>
            <p className="text-xs text-gray-500 mb-3">選択したページの無期限アクセストークンが発行されます</p>
            <div className="space-y-2">
              {pages.map((page) => (
                <button key={page.id} onClick={() => requestPermanentToken(page.id)} className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                  <span className="font-medium text-gray-800">{page.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{page.id}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-gray-500" onClick={() => { setPages(null); setPageSelectOpen(false); }}>キャンセル</Button>
          </div>
        )}

        {exchangeMessage && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${exchangeMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {exchangeMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {exchangeMessage.text}
          </div>
        )}

        {permanentMessage && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${permanentMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {permanentMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {permanentMessage.text}
          </div>
        )}
      </div>

      {client.has_token && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Download className="w-5 h-5 text-gray-400" />API データ取得</h3>
              <p className="text-sm text-gray-500 mt-0.5">Meta Graph APIからデータを自動取得（リアルタイム進捗表示）</p>
            </div>
            <Button onClick={fetchAllFromApi} disabled={fetchAllRunning} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${fetchAllRunning ? "animate-spin" : ""}`} />
              {fetchAllRunning ? "取得中..." : "一括取得"}
            </Button>
          </div>

          {/* Progress bar */}
          {fetchAllRunning && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">進捗</span>
                <span className="text-xs font-bold text-emerald-600">{fetchAllProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${fetchAllProgress}%` }} />
              </div>
            </div>
          )}

          {/* Step status cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: "ig_daily", title: "Instagram日次データ", icon: <Camera className="w-4 h-4 text-pink-600" />, bgColor: "bg-pink-50" },
              { key: "ig_posts", title: "Instagram投稿データ", icon: <FileUp className="w-4 h-4 text-purple-600" />, bgColor: "bg-purple-50" },
              { key: "ig_tagged", title: "タグ付け投稿", icon: <Tag className="w-4 h-4 text-orange-600" />, bgColor: "bg-orange-50" },
              { key: "meta_ads", title: "Meta広告データ", icon: <Megaphone className="w-4 h-4 text-blue-600" />, bgColor: "bg-blue-50" },
            ].map((item) => {
              const state = fetchStates[item.key];
              return (
                <div key={item.key} className="rounded-xl border border-gray-200 p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${item.bgColor} flex items-center justify-center`}>{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                      {state?.message && (
                        <p className={`text-xs mt-0.5 truncate ${state.success === true ? "text-emerald-600" : state.success === false ? "text-red-500" : "text-gray-400"}`}>
                          {state.message}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {state?.loading && <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />}
                      {state?.success === true && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {state?.success === false && <XCircle className="w-5 h-5 text-red-500" />}
                      {!state && <div className="w-5 h-5 rounded-full bg-gray-100" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-500" />
            Instagramインサイト コピペ取込
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Instagramプロフェッショナルダッシュボードからコピーしたデータを貼り付けてインポートします
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-3 text-xs text-gray-500">
          <p className="font-medium text-gray-700 mb-1">対応フォーマット:</p>
          <p>タブ区切り or カンマ区切り。ヘッダー行あり/なし両対応。</p>
          <p className="mt-1 font-mono text-[11px]">日付, インプレッション, リーチ, フォロワー数, ...</p>
          <p className="font-mono text-[11px]">2024-01-01, 1234, 567, 890, ...</p>
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="ここにデータを貼り付けてください..."
          className="w-full h-40 rounded-lg border border-gray-300 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
        />
        <div className="flex items-center gap-3 mt-3">
          <Button
            onClick={handlePasteImport}
            disabled={pasteState.loading || !pasteText.trim()}
            className="bg-pink-600 hover:bg-pink-700 text-white shadow-sm"
            size="sm"
          >
            {pasteState.loading ? (
              <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />インポート中...</>
            ) : (
              <><Upload className="w-3.5 h-3.5 mr-2" />インポート</>
            )}
          </Button>
          {pasteText && (
            <Button variant="ghost" size="sm" onClick={() => setPasteText("")} className="text-gray-500 text-xs">
              クリア
            </Button>
          )}
        </div>
        {pasteState.message && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 mt-3 ${pasteState.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {pasteState.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            {pasteState.message}
          </div>
        )}
      </div>
    </div>
  );
}
