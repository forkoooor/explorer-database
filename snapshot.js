

const { OPENSEA_API } = require("./config.json");

async function fetchAsset(asset_contract_address, tokenId, retry = 5) {
    for (let index = 0; index < retry; index++) {
      try {
        const url = `https://api.opensea.io/api/v1/asset/${asset_contract_address}/${tokenId}`
        const res = await fetch(url, {
          agent: require("proxy-agent")("socks://127.0.0.1:9997"),
          headers: {
            "x-api-key": OPENSEA_API,
          },
        });
        const result = await res.json();
        if (!result) throw new Error("err");
        return result;
      } catch (e) {}
    }
    return null;
}

async function snapshotCollection(contract, { max = 1, min = 1 }) {
    const total = max - min;
    for (let index = 0; index <= total; index++) {
        const tokenId = min + index;
        // console.log(tokenId)
    }
}

snapshotCollection('0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b', {
    min: 1,
    max: 19363
});