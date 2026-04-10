import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

const SUM_COLS = `
  COALESCE(SUM(impressions), 0) as impressions,
  COALESCE(SUM(reach), 0) as reach,
  COALESCE(SUM(clicks), 0) as clicks,
  COALESCE(SUM(spend), 0) as spend,
  COALESCE(SUM(purchase), 0) as purchase,
  COALESCE(SUM(purchase_value), 0) as purchase_value,
  COALESCE(SUM(add_to_cart), 0) as add_to_cart,
  COALESCE(SUM(initiate_checkout), 0) as initiate_checkout
`;

type Row = Record<string, unknown>;

function withDerived(row: Row): Row {
  const spend = Number(row.spend) || 0;
  const clicks = Number(row.clicks) || 0;
  const impressions = Number(row.impressions) || 0;
  const purchase = Number(row.purchase) || 0;
  const purchaseValue = Number(row.purchase_value) || 0;
  return {
    ...row,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: purchase > 0 ? spend / purchase : 0,
    roas: spend > 0 ? purchaseValue / spend : 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await ensureDb();

    const client = await queryOne<Record<string, unknown>>(
      `SELECT client_id FROM ${T} WHERE share_token = @token LIMIT 1`,
      { token: params.token }
    );
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    const clientId = String(client.client_id);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (from && isNaN(new Date(from).getTime())) {
      return NextResponse.json({ error: 'invalid from' }, { status: 400 });
    }
    if (to && isNaN(new Date(to).getTime())) {
      return NextResponse.json({ error: 'invalid to' }, { status: 400 });
    }

    const hasDate = from && to;
    const dateCond = hasDate ? 'AND date >= ? AND date <= ?' : '';
    const dateArgs = hasDate ? [from, to] : [];

    const fetchType = async (type: string) => {
      const r = await db.execute({
        sql: `SELECT breakdown_key, ${SUM_COLS}
              FROM meta_ad_breakdowns
              WHERE client_id = ? AND breakdown_type = ? ${dateCond}
              GROUP BY breakdown_key
              ORDER BY spend DESC`,
        args: [clientId, type, ...dateArgs],
      });
      return r.rows.map((row) => withDerived(row as Row));
    };

    const [age_gender, region, country, hourly, device, placement] = await Promise.all([
      fetchType('age_gender'),
      fetchType('region'),
      fetchType('country'),
      fetchType('hourly'),
      fetchType('device'),
      fetchType('placement'),
    ]);

    return NextResponse.json({ age_gender, region, country, hourly, device, placement });
  } catch (err) {
    console.error('Dashboard breakdowns error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
