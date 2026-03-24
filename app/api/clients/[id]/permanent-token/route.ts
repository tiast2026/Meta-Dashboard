import { NextRequest, NextResponse } from 'next/server';
import { queryOne, runDML, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

/**
 * Generate a never-expiring Page Access Token.
 *
 * Flow:
 * 1. Exchange short-lived user token -> long-lived user token (60 days)
 * 2. Use long-lived user token to get Page Access Token (never expires)
 *
 * The resulting Page Access Token can be used for Instagram Graph API calls
 * and Meta Ads API calls. It never expires as long as the Page and
 * permissions remain valid.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { page_id } = body; // Facebook Page ID (optional on first call)

  const client = await queryOne<Record<string, unknown>>(
    `SELECT meta_access_token FROM ${T} WHERE client_id = @id LIMIT 1`,
    { id: params.id }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const currentToken = client.meta_access_token;

  if (!currentToken) {
    return NextResponse.json(
      { error: 'トークンが設定されていません' },
      { status: 400 }
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'META_APP_ID と META_APP_SECRET を環境変数に設定してください' },
      { status: 500 }
    );
  }

  try {
    // Step 1: Exchange for long-lived user token
    const exchangeUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
    exchangeUrl.searchParams.set('client_id', appId);
    exchangeUrl.searchParams.set('client_secret', appSecret);
    exchangeUrl.searchParams.set('fb_exchange_token', String(currentToken));

    const exchangeRes = await fetch(exchangeUrl.toString(), {
      signal: AbortSignal.timeout(15000),
    });
    const exchangeData = await exchangeRes.json();

    if (exchangeData.error) {
      return NextResponse.json(
        { error: `長期トークン交換エラー: ${exchangeData.error.message}` },
        { status: 400 }
      );
    }

    const longLivedUserToken = exchangeData.access_token;
    if (!longLivedUserToken) {
      return NextResponse.json(
        { error: '長期トークンの取得に失敗しました' },
        { status: 400 }
      );
    }

    // Step 2: If page_id is provided, get the Page Access Token (never expires)
    if (page_id) {
      const pageTokenRes = await fetch(
        `https://graph.facebook.com/v21.0/${page_id}?fields=access_token,name&access_token=${longLivedUserToken}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const pageTokenData = await pageTokenRes.json();

      if (pageTokenData.error) {
        return NextResponse.json(
          { error: `ページトークン取得エラー: ${pageTokenData.error.message}` },
          { status: 400 }
        );
      }

      const pageAccessToken = pageTokenData.access_token;
      if (!pageAccessToken) {
        return NextResponse.json(
          { error: 'ページアクセストークンの取得に失敗しました' },
          { status: 400 }
        );
      }

      // Save the permanent page token
      await runDML(
        `UPDATE ${T} SET meta_access_token = @token, updated_at = CURRENT_TIMESTAMP() WHERE client_id = @id`,
        { token: pageAccessToken, id: params.id }
      );

      return NextResponse.json({
        success: true,
        message: `無期限ページトークンを保存しました (ページ: ${pageTokenData.name || page_id})`,
        page_name: pageTokenData.name,
        expires: 'never',
      });
    }

    // If no page_id, list available pages so user can select one
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&limit=100&access_token=${longLivedUserToken}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return NextResponse.json(
        { error: `ページ一覧取得エラー: ${pagesData.error.message}` },
        { status: 400 }
      );
    }

    const pages = (pagesData.data || []).map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));

    if (pages.length === 0) {
      // No pages found - save the long-lived user token instead
      await runDML(
        `UPDATE ${T} SET meta_access_token = @token, updated_at = CURRENT_TIMESTAMP() WHERE client_id = @id`,
        { token: longLivedUserToken, id: params.id }
      );

      return NextResponse.json({
        success: true,
        message: '管理ページが見つからないため、長期ユーザートークン（60日）を保存しました',
        pages: [],
        expires: '60 days',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'ページを選択してください',
      pages,
      requires_page_selection: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'トークン処理に失敗しました' },
      { status: 500 }
    );
  }
}
