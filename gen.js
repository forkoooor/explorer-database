// const tokens = require("./dune/stolen_tokens.json");
const allCollections = require("./raw.json");
const fs = require("fs");
const _ = require("lodash");
const moment = require('moment');
const allBaseDir = './data/v1';
const newTokens = require("./dune/stolen_tokens_new.json");
const linkers = require("./dune/linkers.json");

const allTokens = [].concat(newTokens).map((_) => {
  const collection = allCollections.find((c) => {
    const contract =
      c.detail.assetContracts.edges &&
      c.detail.assetContracts.edges[0] &&
      c.detail.assetContracts.edges[0].node;
    return contract && contract.address === _.contract_address;
  });
  // console.log(collection.detail);
  if (collection) {
    const { detail } = collection;
    const contract =
      detail.assetContracts.edges &&
      detail.assetContracts.edges[0] &&
      detail.assetContracts.edges[0].node;
    // return contract && contract.address === _.contract_address;
    _.collection = {
      floorPrice: detail.statsV2.floorPrice && detail.statsV2.floorPrice.unit,
      slug: collection.collection.slug,
      name: detail.name,
      description: detail.description,
      imageUrl: detail.imageUrl,
      connectedTwitterUsername: detail.connectedTwitterUsername,
      assetContracts: detail.assetContracts,
      externalUrl: _.externalUrl,
      twitterUsername: _.twitterUsername,
      contract_address: contract.address,
      mediumUsername: _.mediumUsername,
      bannerImageUrl: _.bannerImageUrl,
    };
  }
  return _;
});


function getCollection(offsetDay = 0) {
  const timeLimit = moment().subtract("day", offsetDay);
  const sumBySlug = allTokens.reduce((all, item) => {
    const isIn =
      offsetDay == 0
        ? true
        : moment(item.first_time).toDate().getTime() >
          timeLimit.toDate().getTime(); 

      console.log(
        offsetDay,
        isIn,
      );
    if (isIn) {
       all[item.collection.slug] = all[item.collection.slug] || [];
       all[item.collection.slug].push(item);
    }
    return all;
  }, {});
  return sumBySlug;
}

const sumBySlug = getCollection();


function toSummary(sumBySlug, limit = 100) {
  return Object.keys(sumBySlug)
    .map((slug) => {
      const collection = allTokens.find((_) => _.collection.slug === slug);
      return {
        total: sumBySlug[slug].length,
        ...collection.collection,
      };
    })
    .sort((a, b) => b.total - a.total);
}


const topCollections = toSummary(sumBySlug);

fs.writeFileSync(
  `${allBaseDir}/summary.json`,
  JSON.stringify(topCollections.slice(0, 100))
);


fs.writeFileSync(
  `${allBaseDir}/all.json`,
  JSON.stringify(topCollections)
);


const weekSummary = getCollection(7);
const daySummary = getCollection(1);
const monthSummary = getCollection(30);

fs.writeFileSync(
  `${allBaseDir}/summary_1DayVolume.json`,
  JSON.stringify(toSummary(daySummary))
);

fs.writeFileSync(
  `${allBaseDir}/summary_7DayVolume.json`,
  JSON.stringify(toSummary(weekSummary))
);

fs.writeFileSync(
  `${allBaseDir}/summary_30DayVolume.json`,
  JSON.stringify(toSummary(monthSummary))
);


// return;
const dataCollections = [];
Object.keys(sumBySlug)
  .map((slug) => {
    const collection = allTokens.find((_) => _.collection.slug === slug);
    dataCollections.push({
      collection: collection.collection,
      tokens: sumBySlug[slug].map((_) => ({
        tokenId: _.tokenId,
        firstTime: _.first_time,
        receivers: _.receivers,
        source_hackers: _.receivers.map((_) => linkers[_.replace('0x', '\\x')]),
      })),
    });
    fs.writeFileSync(
      `${allBaseDir}/collections/${collection.collection.contract_address}.json`,
      JSON.stringify({
        collection: collection.collection,
        tokens: sumBySlug[slug].map((_) => ({
          tokenId: _.tokenId,
          firstTime: _.first_time,
          receivers: _.receivers,
          source_hackers: _.receivers.map(
            (_) => linkers[_.replace("0x", "\\x")]
          ),
        })),
      })
    );
  })
  .sort((a, b) => b.total - a.total);

const fetch = require("node-fetch");
const qs = require("querystring");

async function fetchAssets(ids = [], asset_contract_address) {
  for (let index = 0; index < 10; index++) {
    try {
      const url =
        `https://api.opensea.io/api/v1/assets?` +
        qs.stringify({
          token_ids: ids,
          asset_contract_address,
        });
      console.log("url", url);
      const res = await fetch(url, {
        agent: require("proxy-agent")("http://127.0.0.1:9999"),
        headers: {
          // from phishing site
          "x-api-key": "388436d3204b491abdff3751f3185c61",
        },
      });
      const result = await res.json();
      if (!result.assets) throw new Error('err')
      return result.assets;
    } catch (e) {}
  }

  return null
}

(async () => {
  for (let index = 0; index < dataCollections.length; index++) {
    const dataCollection = dataCollections[index];
     dataCollection.tokens = dataCollection.tokens.filter((_) => _.tokenId[0] != "-");
    
    const tokenIds = dataCollection.tokens.map((_) => _.tokenId);
    const items = _.chunk(tokenIds, 20);
    const tokensMeta = [];
    const collectionAddr = dataCollection.collection.contract_address;
    // if (collectionAddr != "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85")
    //   continue;

    for (let index = 0; index < items.length; index++) {
      const tokens = items[index];
      const localAssets = tokens.map((tokenId) => {
        const fPath = `${allBaseDir}/collections/${collectionAddr}/${tokenId}.json`;
        if (fs.existsSync(fPath)) {
          return {
            tokenId,
            raw: JSON.parse(fs.readFileSync(fPath, "utf-8")),
          };
        }
        return {
          tokenId,
          raw: null
        };
      });

      const notExistsTokens = localAssets.filter((_) => _.raw === null);
      // console.log(
      //   "localAssets",
      //   localAssets.map((_) => _.raw)
      // );
      const fetchedAssets = notExistsTokens.length
        ? await fetchAssets(
            notExistsTokens.map((_) => _.tokenId),
            collectionAddr
          )
        : [];
    
      const assets = [].concat(localAssets.filter(_ =>  _.raw).map(_ => _.raw), fetchedAssets);
        // console.log({
        //   fetchedAssets: fetchedAssets[0],
        //   notExistsTokens: localAssets[0],
        // });
      assets.forEach((raw) => {
        tokensMeta.push({
          tokenId: raw.token_id,
          image_url: raw.image_url,
          image_preview_url: raw.image_preview_url,
          image_thumbnail_url: raw.image_thumbnail_url,
          name: raw.name,
          last_sale: raw.last_sale,
        });

       const lastMeta =
         dataCollection.tokens.find((c) => raw.token_id === c.tokenId) || {};
        raw.chain_activity = lastMeta;
        const baseDir = `${allBaseDir}/collections/${collectionAddr}/`;
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);
        fs.writeFileSync(
          `${allBaseDir}/collections/${collectionAddr}/${raw.token_id}.json`,
          JSON.stringify(raw)
        );
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
    }

    dataCollection.tokens = dataCollection.tokens.map((_) => {
      const meta = tokensMeta.find((c) => _.tokenId === c.tokenId) || {};
      return {
        ...meta,
        ..._,
      };
    });

    console.log(dataCollection);
    fs.writeFileSync(
      `${allBaseDir}/collections/${collectionAddr}.json`,
      JSON.stringify(dataCollection)
    );
    //  await fetchAssets(
    //    [47258, 29984],
    //    "0x9378368ba6b85c1fba5b131b530f5f5bedf21a18"
    //  );
  }
  // 388436d3204b491abdff3751f3185c61
})();
// console.log(topCollections.slice(0, 100));
