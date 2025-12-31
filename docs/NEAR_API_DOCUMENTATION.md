# NEAR Protocol API Documentation

This document contains comprehensive information about NEAR Protocol APIs for integration into the Nearcity project.

## Table of Contents
1. [NEAR RPC API](#near-rpc-api)
2. [@near-js SDK Packages](#near-js-sdk-packages)
3. [Common API Endpoints](#common-api-endpoints)
4. [Usage Examples](#usage-examples)

---

## NEAR RPC API

The NEAR RPC API allows direct communication with the NEAR blockchain network. All RPC calls are made via HTTP POST requests to RPC endpoints.

### Base URLs
- **Mainnet**: `https://rpc.mainnet.near.org`
- **Testnet**: `https://rpc.testnet.near.org`
- **Betanet**: `https://rpc.betanet.near.org`

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "METHOD_NAME",
  "params": {}
}
```

---

## Common API Endpoints

### 1. Query Account Information
**Method**: `query`
**Description**: Get account information including balance, code hash, locked amount, storage usage, etc.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_account",
    "finality": "final",
    "account_id": "account.near"
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "result": {
    "amount": "1000000000000000000000000",
    "block_hash": "7Fyccs4YxUQ5qXHrXvJpJpJpJpJpJpJpJpJpJpJpJpJp",
    "block_height": 123456789,
    "code_hash": "11111111111111111111111111111111",
    "locked": "0",
    "storage_paid_at": 0,
    "storage_usage": 182
  }
}
```

### 2. View Contract State
**Method**: `query`
**Description**: View contract state or call a view method on a contract.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "call_function",
    "finality": "final",
    "account_id": "contract.near",
    "method_name": "get_balance",
    "args_base64": "eyJhY2NvdW50X2lkIjoidGVzdC5uZWFyIn0="
  }
}
```

### 3. Get Block Information
**Method**: `block`
**Description**: Get block information by block hash or height.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "block",
  "params": {
    "finality": "final"
  }
}
```

### 4. Get Transaction Status
**Method**: `tx`
**Description**: Get transaction status by hash.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "tx",
  "params": {
    "tx_hash": "base58_encoded_hash",
    "sender_account_id": "sender.near"
  }
}
```

### 5. Get Access Key Information
**Method**: `query`
**Description**: Get access key information for an account.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_access_key",
    "finality": "final",
    "account_id": "account.near",
    "public_key": "ed25519:..."
  }
}
```

### 6. Get Account Access Keys
**Method**: `query`
**Description**: Get all access keys for an account.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_access_key_list",
    "finality": "final",
    "account_id": "account.near"
  }
}
```

### 7. Get Recent Block Hash
**Method**: `block`
**Description**: Get the most recent block hash.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "block",
  "params": {
    "finality": "final"
  }
}
```

### 8. Get Gas Price
**Method**: `gas_price`
**Description**: Get current gas price.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "gas_price",
  "params": {
    "block_id": 123456789
  }
}
```

### 9. Broadcast Transaction
**Method**: `broadcast_tx_commit`
**Description**: Broadcast a signed transaction and wait until it's fully complete.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "broadcast_tx_commit",
  "params": {
    "signed_transaction": "base58_encoded_signed_tx"
  }
}
```

### 10. Broadcast Transaction Async
**Method**: `broadcast_tx_async`
**Description**: Broadcast a signed transaction without waiting for completion.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "broadcast_tx_async",
  "params": {
    "signed_transaction": "base58_encoded_signed_tx"
  }
}
```

---

## NEAR Social Indexer / NEAR Social API

The frontend uses a public NEAR Social indexer to fetch social posts and profiles. By default the project uses the env var `NEXT_PUBLIC_NEAR_SOCIAL_API` and falls back to `https://social.everything.dev` if not set.

If posts or profiles do not appear in the UI, the most common causes are:
- The public indexer endpoint is unavailable or rate-limited
- Network/CORS issues when calling RPC directly from the browser

Troubleshooting steps:
1. Set a working indexer URL in `.env.local`, e.g.:

```env
NEXT_PUBLIC_NEAR_SOCIAL_API=https://social.everything.dev
# or another compatible indexer endpoint
```

2. Restart the dev server (`npm run dev`) after updating `.env.local`.
3. Check the browser console for network or CORS errors and the server logs for SDK errors.

---

## @near-js SDK Packages

### Installation
```bash
npm install @near-js/accounts @near-js/signers @near-js/transactions @near-js/providers @near-js/utils @near-js/crypto @near-js/types
```

### Key Packages

#### @near-js/accounts
Manage accounts and interact with contracts.

**Example**:
```typescript
import { Account } from "@near-js/accounts";
import { InMemorySigner } from "@near-js/signers";
import { connect, keyStores } from "@near-js/wallet-account";

const keyStore = new keyStores.InMemoryKeyStore();
const config = {
  networkId: "testnet",
  keyStore,
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
};

const near = await connect(config);
const account = await near.account("account.near");
```

#### @near-js/providers
Communicate with NEAR RPC.

**Example**:
```typescript
import { JsonRpcProvider } from "@near-js/providers";

const provider = new JsonRpcProvider({ url: "https://rpc.testnet.near.org" });
const accountInfo = await provider.query({
  request_type: "view_account",
  finality: "final",
  account_id: "account.near",
});
```

#### @near-js/transactions
Compose, serialize, and sign NEAR transactions.

**Example**:
```typescript
import { createTransaction } from "@near-js/transactions";
import { functionCall } from "@near-js/transactions/actions";

const transaction = createTransaction(
  account.accountId,
  publicKey,
  receiverId,
  nonce,
  [functionCall("method_name", args, gas, deposit)]
);
```

---

## Usage Examples

### Example 1: Get Account Balance
```typescript
async function getAccountBalance(accountId: string) {
  const response = await fetch("https://rpc.testnet.near.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      },
    }),
  });
  
  const data = await response.json();
  return data.result.amount;
}
```

### Example 2: Call View Method on Contract
```typescript
async function callViewMethod(
  contractId: string,
  methodName: string,
  args: any
) {
  const response = await fetch("https://rpc.testnet.near.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: methodName,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  });
  
  const data = await response.json();
  return JSON.parse(Buffer.from(data.result.result, "base64").toString());
}
```

### Example 3: Get Transaction Status
```typescript
async function getTransactionStatus(txHash: string, senderAccountId: string) {
  const response = await fetch("https://rpc.testnet.near.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "tx",
      params: {
        tx_hash: txHash,
        sender_account_id: senderAccountId,
      },
    }),
  });
  
  return await response.json();
}
```

---

## Important Notes

1. **Finality Options**: Use `"final"` for finalized blocks, `"optimistic"` for recent blocks, or a specific block hash/height.

2. **Base64 Encoding**: Function call arguments must be base64 encoded.

3. **Gas and Deposit**: When calling contract methods, specify gas (in gas units) and deposit (in yoctoNEAR).

4. **Error Handling**: Always check for `error` field in RPC responses.

5. **Rate Limiting**: Be mindful of RPC rate limits. Consider using your own RPC node for production.

---

## Additional Resources

- Official NEAR RPC Documentation: https://docs.near.org/api/rpc/introduction
- NEAR API JS Documentation: https://docs.near.org/tools/near-api
- NEAR Protocol Documentation: https://docs.near.org


