WITH goclaim_events AS (
  SELECT
    block_time,
    block_number,
    tx_hash,
    contract_address,
    topic0,
    topic1,
    topic2,
    topic3,
    data,
    index AS log_index
  FROM celo.logs
  WHERE contract_address = 0x3cf4b49daca649419df30ae1d2dc99f0cb518a50
),

decoded AS (
  SELECT
    block_time,
    block_number,
    tx_hash,
    log_index,
    topic0,

    CASE topic0
      WHEN 0x7c4b1bfd07ee6d3742f8d507abc0a43a67c9eb28834ebfe6423ddbce6bab8e25 THEN 'GoClaimAccountCreated'
      WHEN 0x47aca9c53774718582200ab459fed2825f28bc0656147a188e324681c2111173 THEN 'GoClaimAccountConnected'
      WHEN 0xbccd1efe71e174a9d33d1a759c250d1896327c18b8b3fe308c15543416609042 THEN 'GoClaimUBIClaimed'
      WHEN 0x1a07cb815898d3e02cf9aba6b550d8751f8eaa793efc1d1aab4c57d9e92da236 THEN 'GoClaimTokenTransferred'
      WHEN 0xce4752324020799b3753c4ffd2aef5b1dfae060d0ece3d29991b7a13f76aeedc THEN 'GoClaimSignerUpdated'
      WHEN 0x284abf3e936f62b6a5b7463989742a893a6bf8c83d30974991b7dc65e110bc17 THEN 'ContractUpgraded'
      ELSE 'Unknown'
    END AS event_name,

    -- ===== GoClaimAccountCreated =====
    CASE WHEN topic0 = 0x7c4b1bfd07ee6d3742f8d507abc0a43a67c9eb28834ebfe6423ddbce6bab8e25
      THEN bytearray_substring(topic1, 13, 20) END AS created_smart_account_address,

    -- ===== GoClaimAccountConnected =====
    CASE WHEN topic0 = 0x47aca9c53774718582200ab459fed2825f28bc0656147a188e324681c2111173
      THEN bytearray_substring(topic1, 13, 20) END AS connected_smart_account_address,
    CASE WHEN topic0 = 0x47aca9c53774718582200ab459fed2825f28bc0656147a188e324681c2111173
      THEN bytearray_substring(topic2, 13, 20) END AS connected_whitelisted_root,

    -- ===== GoClaimUBIClaimed =====
    CASE WHEN topic0 = 0xbccd1efe71e174a9d33d1a759c250d1896327c18b8b3fe308c15543416609042
      THEN bytearray_substring(topic1, 13, 20) END AS ubi_smart_account_address,
    CASE WHEN topic0 = 0xbccd1efe71e174a9d33d1a759c250d1896327c18b8b3fe308c15543416609042
      THEN bytearray_substring(topic2, 13, 20) END AS ubi_whitelisted_root,
    CASE WHEN topic0 = 0xbccd1efe71e174a9d33d1a759c250d1896327c18b8b3fe308c15543416609042
      THEN bytearray_substring(bytearray_substring(data, 1, 32), 13, 20) END AS ubi_token,
    CASE WHEN topic0 = 0xbccd1efe71e174a9d33d1a759c250d1896327c18b8b3fe308c15543416609042
      THEN bytearray_to_uint256(bytearray_substring(data, 33, 32)) END AS ubi_amount_raw,

    -- ===== GoClaimTokenTransferred =====
    CASE WHEN topic0 = 0x1a07cb815898d3e02cf9aba6b550d8751f8eaa793efc1d1aab4c57d9e92da236
      THEN bytearray_substring(topic1, 13, 20) END AS transfer_smart_account_address,
    CASE WHEN topic0 = 0x1a07cb815898d3e02cf9aba6b550d8751f8eaa793efc1d1aab4c57d9e92da236
      THEN bytearray_substring(topic2, 13, 20) END AS transfer_recipient,
    CASE WHEN topic0 = 0x1a07cb815898d3e02cf9aba6b550d8751f8eaa793efc1d1aab4c57d9e92da236
      THEN bytearray_substring(bytearray_substring(data, 1, 32), 13, 20) END AS transfer_token,
    CASE WHEN topic0 = 0x1a07cb815898d3e02cf9aba6b550d8751f8eaa793efc1d1aab4c57d9e92da236
      THEN bytearray_to_uint256(bytearray_substring(data, 33, 32)) END AS transfer_amount_raw,

    -- ===== GoClaimSignerUpdated =====
    CASE WHEN topic0 = 0xce4752324020799b3753c4ffd2aef5b1dfae060d0ece3d29991b7a13f76aeedc
      THEN bytearray_substring(topic1, 13, 20) END AS old_signer,
    CASE WHEN topic0 = 0xce4752324020799b3753c4ffd2aef5b1dfae060d0ece3d29991b7a13f76aeedc
      THEN bytearray_substring(topic2, 13, 20) END AS new_signer,

    -- ===== ContractUpgraded =====
    CASE WHEN topic0 = 0x284abf3e936f62b6a5b7463989742a893a6bf8c83d30974991b7dc65e110bc17
      THEN bytearray_to_uint256(bytearray_substring(data, 1, 32)) END AS upgrade_old_version,
    CASE WHEN topic0 = 0x284abf3e936f62b6a5b7463989742a893a6bf8c83d30974991b7dc65e110bc17
      THEN bytearray_to_uint256(bytearray_substring(data, 33, 32)) END AS upgrade_new_version,
    CASE WHEN topic0 = 0x284abf3e936f62b6a5b7463989742a893a6bf8c83d30974991b7dc65e110bc17
      THEN bytearray_substring(topic1, 13, 20) END AS upgrade_new_implementation

  FROM goclaim_events
)

SELECT * FROM decoded
ORDER BY block_time DESC