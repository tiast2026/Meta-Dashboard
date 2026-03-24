import { NextRequest, NextResponse } from 'next/server';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export async function GET(
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

  const result: {
    valid: boolean;
    type?: string;
    expires_at?: string;
    scopes?: string[];
    message?: string;
  } = { valid: false };

  if (client.meta_access_token) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${client.meta_access_token}&access_token=${client.meta_access_token}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      if (data.data) {
        const d = data.data;
        result.valid = d.is_valid !== false;
        result.type = d.type || 'Unknown';
        result.expires_at = d.expires_at
          ? d.expires_at === 0
            ? 'never'
            : new Date(d.expires_at * 1000).toISOString()
          : undefined;
        result.scopes = d.scopes;
      } else if (data.error) {
        result.message = data.error.message;
      }
    } catch (err) {
      result.message = err instanceof Error ? err.message : 'Failed to check token';
    }
  } else {
    result.message = 'トークン未設定';
  }

  return NextResponse.json(result);
}
