import { NextRequest, NextResponse } from 'next/server';
import { queryOne, runDML, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await queryOne<Record<string, unknown>>(
    `SELECT meta_access_token FROM ${T} WHERE client_id = @id LIMIT 1`,
    { id: params.id }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const shortToken = client.meta_access_token;

  if (!shortToken) {
    return NextResponse.json(
      { error: 'トークンが設定されていません。先にアクセストークンを保存してください。' },
      { status: 400 }
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'サーバーにMETA_APP_IDとMETA_APP_SECRETが設定されていません。環境変数を設定してください。' },
      { status: 500 }
    );
  }

  try {
    // Exchange short-lived token for long-lived token
    const exchangeUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
    exchangeUrl.searchParams.set('client_id', appId);
    exchangeUrl.searchParams.set('client_secret', appSecret);
    exchangeUrl.searchParams.set('fb_exchange_token', String(shortToken));

    const res = await fetch(exchangeUrl.toString(), {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'トークン交換に失敗しました' },
        { status: 400 }
      );
    }

    if (!data.access_token) {
      return NextResponse.json(
        { error: 'レスポンスにアクセストークンが含まれていません' },
        { status: 400 }
      );
    }

    // Save the long-lived token to the database
    await runDML(
      `UPDATE ${T} SET meta_access_token = @token, updated_at = CURRENT_TIMESTAMP() WHERE client_id = @id`,
      { token: data.access_token, id: params.id }
    );

    // Calculate expiry info
    const expiresIn = data.expires_in; // seconds
    let expiresAt: string | undefined;
    if (expiresIn) {
      const expDate = new Date(Date.now() + expiresIn * 1000);
      expiresAt = expDate.toISOString();
    }

    return NextResponse.json({
      success: true,
      message: '長期トークンへの交換が完了しました',
      expires_in_days: expiresIn ? Math.floor(expiresIn / 86400) : null,
      expires_at: expiresAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'トークン交換に失敗しました' },
      { status: 500 }
    );
  }
}
