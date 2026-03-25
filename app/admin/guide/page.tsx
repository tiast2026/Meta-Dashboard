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
              <li><strong>Instagram アカウント ID</strong> - 下記「Instagram アカウント ID の取得方法」を参照</li>
              <li><strong>Meta 広告アカウント ID</strong> - 下記「Meta 広告アカウント ID の取得方法」を参照</li>
            </ul>

            {/* Instagram アカウント ID の取得方法 */}
            <div className="mt-4 bg-indigo-50 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-800 mb-3">Instagram アカウント ID の取得方法</h4>
              <p className="text-gray-700 mb-2">
                Instagram アカウント ID は数字のみのIDです（例: 17841400123456789）。ユーザーネームとは異なります。
              </p>
              <p className="text-gray-700 font-medium mb-2">前提条件:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
                <li>Instagramアカウントが<strong>ビジネスアカウント</strong>または<strong>クリエイターアカウント</strong>であること</li>
                <li>Instagramアカウントが<strong>Facebookページにリンク</strong>されていること</li>
              </ul>
              <p className="text-gray-700 font-medium mb-2">方法1: Graph API Explorer を使う（推奨）</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Graph API Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  を開く
                </li>
                <li>右上のアプリセレクタで対象のアプリを選択</li>
                <li>「Generate Access Token」でトークンを生成（権限: <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs font-mono">instagram_basic</code>, <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs font-mono">pages_show_list</code>）</li>
                <li>
                  クエリ欄に <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">me/accounts</code> と入力して「Submit」→ Facebookページ一覧が表示される
                </li>
                <li>
                  表示されたページの <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs font-mono">id</code> をコピーし、クエリ欄に <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">{'{ページID}'}?fields=instagram_business_account</code> と入力して「Submit」
                </li>
                <li>
                  レスポンスの <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs font-mono">instagram_business_account.id</code> が Instagram アカウント ID です
                </li>
              </ol>

              <p className="text-gray-700 font-medium mt-3 mb-2">方法2: Meta Business Suite から確認</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>
                  <a
                    href="https://business.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Meta Business Suite <ExternalLink className="w-3 h-3" />
                  </a>
                  にログイン
                </li>
                <li>左メニュー「設定」→「アカウント」→「Instagramアカウント」を選択</li>
                <li>表示されるURLの末尾、またはアカウント詳細画面に表示される数字IDがInstagramアカウントIDです</li>
              </ol>
            </div>

            {/* Meta 広告アカウント ID の取得方法 */}
            <div className="mt-4 bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-3">Meta 広告アカウント ID の取得方法</h4>
              <p className="text-gray-700 mb-2">
                広告アカウントIDは <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">act_</code> から始まる文字列です（例: act_123456789）。
              </p>
              <p className="text-gray-700 font-medium mb-2">方法1: Meta広告マネージャから確認（最も簡単）</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>
                  <a
                    href="https://adsmanager.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Meta広告マネージャ <ExternalLink className="w-3 h-3" />
                  </a>
                  を開く
                </li>
                <li>ブラウザのURLバーを確認 → <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">act=123456789</code> の部分がアカウントIDです</li>
                <li>入力時は <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">act_123456789</code> の形式で入力してください</li>
              </ol>

              <p className="text-gray-700 font-medium mt-3 mb-2">方法2: Meta Business Suite の設定から確認</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>
                  <a
                    href="https://business.facebook.com/settings/ad-accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    ビジネス設定 → 広告アカウント <ExternalLink className="w-3 h-3" />
                  </a>
                  を開く
                </li>
                <li>対象の広告アカウントを選択すると、アカウントIDが表示されます</li>
              </ol>

              <p className="text-gray-700 font-medium mt-3 mb-2">方法3: Graph API Explorer を使う</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Graph API Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  でトークンを生成（権限: <code className="bg-purple-100 px-1 py-0.5 rounded text-xs font-mono">ads_read</code>）
                </li>
                <li>
                  クエリ欄に <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">me/adaccounts</code> と入力して「Submit」
                </li>
                <li>レスポンスの <code className="bg-purple-100 px-1 py-0.5 rounded text-xs font-mono">id</code> フィールド（act_から始まる値）が広告アカウントIDです</li>
              </ol>
            </div>
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
            {/* Metaアプリの作成 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Step 2-1: Metaアプリを作成する</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <a
                    href="https://developers.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Meta for Developers <ExternalLink className="w-3 h-3" />
                  </a>
                  にFacebookアカウントでログイン
                </li>
                <li>右上の「マイアプリ」→「アプリを作成」をクリック</li>
                <li>ユースケースを選択 →「その他」→「次へ」</li>
                <li>アプリタイプは「ビジネス」を選択 →「次へ」</li>
                <li>アプリ名を入力（例: Instagram Dashboard）→「アプリを作成」</li>
                <li>
                  アプリダッシュボードで「Instagram Graph API」の「設定」をクリックしてプロダクトを追加
                </li>
              </ol>
            </div>

            {/* Instagram Graph API トークン */}
            <div className="bg-emerald-50 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-800 mb-3">Step 2-2: Instagram Graph API トークンを取得する</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Graph API Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  を開く
                </li>
                <li>右上の「Meta App」ドロップダウンで、Step 2-1 で作成したアプリを選択</li>
                <li>「User or Page」ドロップダウンで「Get User Access Token」を選択</li>
                <li>
                  「Permissions」をクリックし、以下の権限にチェックを入れる:
                  <div className="mt-2 ml-4 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <code className="bg-emerald-100 px-2 py-1 rounded text-xs font-mono">instagram_basic</code>
                    <code className="bg-emerald-100 px-2 py-1 rounded text-xs font-mono">instagram_manage_insights</code>
                    <code className="bg-emerald-100 px-2 py-1 rounded text-xs font-mono">pages_show_list</code>
                    <code className="bg-emerald-100 px-2 py-1 rounded text-xs font-mono">pages_read_engagement</code>
                    <code className="bg-emerald-100 px-2 py-1 rounded text-xs font-mono">business_management</code>
                  </div>
                </li>
                <li>「Generate Access Token」をクリック → Facebookログインで許可</li>
                <li>表示されたトークン（長い英数字の文字列）をコピー</li>
                <li>このダッシュボードのクライアント詳細ページに貼り付けて保存</li>
              </ol>
              <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 mt-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-700 text-xs">
                  ここで取得するトークンは<strong>短期トークン（約1〜2時間有効）</strong>です。Step 4 で無期限トークンに変換してください。
                </p>
              </div>
            </div>

            {/* Meta広告 API トークン */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-3">Step 2-3: Meta広告 API トークンを取得する（広告データが必要な場合）</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  同じ
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Graph API Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  を使用
                </li>
                <li>
                  追加で以下の権限にもチェックを入れる:
                  <div className="mt-2 ml-4 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <code className="bg-purple-100 px-2 py-1 rounded text-xs font-mono">ads_read</code>
                    <code className="bg-purple-100 px-2 py-1 rounded text-xs font-mono">ads_management</code>
                  </div>
                </li>
                <li>「Generate Access Token」をクリックして新しいトークンを生成</li>
                <li>生成されたトークンをクライアント設定の広告トークン欄に貼り付け</li>
              </ol>
              <p className="text-purple-600 text-xs mt-2">
                ※ Instagram と Meta広告を同じトークンで管理する場合は、Step 2-2 で広告権限も含めて生成すれば1つのトークンで対応可能です。
              </p>
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
