"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

export default function GuidePage() {
  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-gray-500 hover:text-indigo-600 mb-6 inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        クライアント一覧に戻る
      </Link>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">セットアップガイド</h2>
      <p className="text-sm text-gray-500 mb-8">
        クライアント設定・トークン取得・長期トークン発行の手順
      </p>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
              1
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              クライアントを作成する
            </h3>
          </div>
          <div className="ml-11 space-y-3 text-sm text-gray-600">
            <p>「新規クライアント」ボタンをクリックして、以下の情報を入力します。</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>クライアント名</strong> - 会社名やプロジェクト名（日本語OK）</li>
              <li><strong>ローマ字表記</strong> - URL等で使用する英語表記（任意）</li>
              <li><strong>Instagram アカウント ID</strong> - Instagram Business/Creator アカウントのID</li>
              <li><strong>Meta 広告アカウント ID</strong> - act_ から始まる広告アカウントID</li>
            </ul>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
              2
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              アクセストークンを取得する
            </h3>
          </div>
          <div className="ml-11 space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Instagram Graph API トークン</h4>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>
                  <a
                    href="https://developers.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Meta for Developers <ExternalLink className="w-3 h-3" />
                  </a>
                  にログイン
                </li>
                <li>アプリを作成（ビジネスタイプ推奨）</li>
                <li>「Instagram Graph API」プロダクトを追加</li>
                <li>Graph API Explorer でトークンを生成
                  <ul className="list-disc list-inside ml-4 mt-1 text-gray-500">
                    <li>必要な権限: instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement</li>
                  </ul>
                </li>
                <li>生成されたトークンをクライアント設定に貼り付け</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Meta広告 API トークン</h4>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>同じアプリの Graph API Explorer を使用</li>
                <li>追加の権限: ads_read, ads_management</li>
                <li>生成されたトークンをクライアント設定に貼り付け</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
              3
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              接続テストを実行する
            </h3>
          </div>
          <div className="ml-11 space-y-3 text-sm text-gray-600">
            <p>クライアント詳細ページの「接続テスト」ボタンをクリックします。</p>
            <div className="flex items-start gap-2 bg-emerald-50 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-emerald-700">
                接続成功の場合、アカウント名やフォロワー数が表示されます。
              </p>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-700">
                接続に失敗した場合は、トークンが正しいか、必要な権限があるか確認してください。
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
              4
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              長期トークン・無期限トークンを発行する
            </h3>
          </div>
          <div className="ml-11 space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">トークンの種類</h4>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">種類</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">有効期限</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">取得方法</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2">短期トークン</td>
                      <td className="px-4 py-2 text-red-600">約1〜2時間</td>
                      <td className="px-4 py-2">Graph API Explorer で生成</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">長期トークン</td>
                      <td className="px-4 py-2 text-amber-600">約60日</td>
                      <td className="px-4 py-2">「長期トークンに交換」ボタン</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">無期限ページトークン</td>
                      <td className="px-4 py-2 text-emerald-600 font-medium">無期限</td>
                      <td className="px-4 py-2">「無期限トークンを発行」ボタン</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">無期限トークンの発行手順</h4>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>短期トークンをクライアント設定に保存</li>
                <li>クライアント詳細ページで「無期限トークンを発行」をクリック</li>
                <li>Facebookページ一覧が表示されるので、対象ページを選択</li>
                <li>自動的にページアクセストークン（無期限）が保存される</li>
              </ol>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-blue-700">
                <p className="font-medium">環境変数の設定が必要です</p>
                <p className="mt-1">
                  長期トークン・無期限トークンの発行には、Vercelの環境変数に
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono mx-1">META_APP_ID</code>
                  と
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono mx-1">META_APP_SECRET</code>
                  の設定が必要です。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
              5
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              CSVデータをインポートする
            </h3>
          </div>
          <div className="ml-11 space-y-3 text-sm text-gray-600">
            <p>クライアント詳細ページの「CSVデータ取込」セクションから、4種類のデータをアップロードできます。</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>Instagram日次データ</strong> - アカウントの日次インサイト</li>
              <li><strong>Instagram投稿データ</strong> - 各投稿のパフォーマンス</li>
              <li><strong>タグ付け投稿</strong> - 他アカウントからのタグ付け</li>
              <li><strong>Meta広告データ</strong> - キャンペーン・広告セットの成果</li>
            </ul>
            <p className="text-gray-500">
              CSVは日本語ヘッダーに対応しています。各カードの「テンプレートCSVをダウンロード」ボタンからテンプレートを取得できます。日付形式は「2024年1月5日」「2024/1/5」の両方に対応。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
