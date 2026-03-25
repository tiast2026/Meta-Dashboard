import { NextRequest, NextResponse } from 'next/server';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await queryOne<Record<string, unknown>>(
    `SELECT meta_access_token, instagram_account_id, meta_ad_account_id FROM ${T} WHERE client_id = @id LIMIT 1`,
    { id: params.id }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const token = client.meta_access_token;
  const results: Record<string, { success: boolean; message: string; data?: Record<string, unknown> }> = {};

  // Test Instagram connection
  if (token && client.instagram_account_id) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${client.instagram_account_id}?fields=id,name,username,followers_count,media_count&access_token=${token}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      if (data.error) {
        results.instagram = {
          success: false,
          message: data.error.message || 'API error',
        };
      } else {
        results.instagram = {
          success: true,
          message: 'OK',
          data: {
            username: data.username || data.name || data.id,
            followers_count: data.followers_count,
            media_count: data.media_count,
          },
        };
      }
    } catch (err) {
      results.instagram = {
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  } else {
    results.instagram = {
      success: false,
      message: !token ? 'トークン未設定' : 'アカウントID未設定',
    };
  }

  // Test Meta Ads connection
  if (token && client.meta_ad_account_id) {
    try {
      const adAccountId = String(client.meta_ad_account_id).startsWith('act_')
        ? client.meta_ad_account_id
        : `act_${client.meta_ad_account_id}`;
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${adAccountId}?fields=id,name,account_status,currency&access_token=${token}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      if (data.error) {
        results.meta_ads = {
          success: false,
          message: data.error.message || 'API error',
        };
      } else {
        const statusMap: Record<number, string> = {
          1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED',
          7: 'PENDING_RISK_REVIEW', 8: 'PENDING_SETTLEMENT',
          9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE', 101: 'CLOSED',
          201: 'ANY_ACTIVE', 202: 'ANY_CLOSED',
        };
        results.meta_ads = {
          success: true,
          message: 'OK',
          data: {
            name: data.name,
            status: statusMap[data.account_status] || `STATUS_${data.account_status}`,
            currency: data.currency,
          },
        };
      }
    } catch (err) {
      results.meta_ads = {
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  } else {
    results.meta_ads = {
      success: false,
      message: !token ? 'トークン未設定' : 'アカウントID未設定',
    };
  }

  return NextResponse.json(results);
}
