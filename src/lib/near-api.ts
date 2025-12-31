export async function fetchRecentTransactions(accountId: string, limit = 5) {
  // Uses an optional Explorer API. Set NEXT_PUBLIC_NEAR_EXPLORER_API to something like
  // https://explorer.testnet.near.org/api or a compatible indexer that exposes
  // GET /account/{accountId}/transactions?limit={limit}
  const base = process.env.NEXT_PUBLIC_NEAR_EXPLORER_API;
  if (!base) return [];

  try {
    const url = `${base.replace(/\/$/, '')}/account/${encodeURIComponent(accountId)}/transactions?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    // Normalize to a simple shape
    return (data || []).map((t: any) => ({
      hash: t.hash || t.transaction_hash || t.tx_hash || t.hash, // various explorer shapes
      signer: t.signer_id || t.signer || t.predecessor_id,
      receiver: t.receiver_id || t.receiver,
      blockTimestamp: t.block_timestamp || t.block_time || t.timestamp || null,
      actions: t.actions || t.actions_count || null,
      status: t.status || null,
    }));
  } catch (err) {
    console.error('Failed to fetch transactions', err);
    return [];
  }
}

export async function fetchNearUsdPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd');
    if (!res.ok) return null;
    const json = await res.json();
    return json?.near?.usd ?? null;
  } catch (err) {
    console.error('Failed to fetch NEAR price', err);
    return null;
  }
}