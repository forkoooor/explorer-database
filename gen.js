// const tokens = require("./dune/stolen_tokens.json");
const allCollections = require("./raw.json");
const fs = require("fs");
const _ = require("lodash");
const moment = require('moment');
const allBaseDir = './data/v1';
const newTokens = require("./dune/stolen_tokens_new.json");
const linkers = require("./dune/linkers.json");
const { OPENSEA_API } = require('./config.json');

const allTokens = [].concat(newTokens).map((_) => {
  _.source_hackers =  _.receivers.map((_) => linkers[_.replace('0x', '\\x')]);
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

    if (isIn) {
       all[item.collection.slug] = all[item.collection.slug] || [];
       all[item.collection.slug].push(item);
    }
    return all;
  }, {});

  const byDaySum = allTokens.reduce((all, item) => {
    const isIn =
      offsetDay == 0
        ? true
        : moment(item.first_time).toDate().getTime() >
          timeLimit.toDate().getTime();

    if (isIn) {
      const day = moment(item.first_time).format('YYYY-MM-DD')
      const value = parseFloat(item.collection.floorPrice);
      all[day] = all[day] || {
        total: 0,
        value: 0
      };
      all[day].value += value;
      all[day].total += 1;
    }
    return all;
  }, {});
  // console.log("byDaySum", byDaySum);
  return {
    collection: sumBySlug,
    trends: byDaySum,
  };
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


const topCollections = toSummary(sumBySlug.collection);

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
  JSON.stringify(toSummary(daySummary.collection))
);

fs.writeFileSync(
  `${allBaseDir}/summary_7DayVolume.json`,
  JSON.stringify(toSummary(weekSummary.collection))
);

fs.writeFileSync(
  `${allBaseDir}/summary_7DayVolume_trends.json`,
  JSON.stringify(Object.keys(weekSummary.trends).map(_ => {

    return {
      day: _,
      ...weekSummary.trends[_]
    }
  }))
);

return;

fs.writeFileSync(
  `${allBaseDir}/summary_30DayVolume.json`,
  JSON.stringify(toSummary(monthSummary.collection))
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
        senders: _.senders,
        source_hackers: _.receivers.map((_) => linkers[_.replace("0x", "\\x")]),
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
          senders: _.senders,
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
        // agent: require("proxy-agent")("http://127.0.0.1:9999"),
        headers: {
          "x-api-key": OPENSEA_API,
        },
      });
      const result = await res.json();
      if (!result.assets) throw new Error('err')
      return result.assets;
    } catch (e) {}
  }

  return null
}

function getTokenDetail(collectionAddr, tokenId) {
  const fPath = `${allBaseDir}/collections/${collectionAddr}/${tokenId}.json`;
  if (fs.existsSync(fPath)) {
    return JSON.parse(fs.readFileSync(fPath, "utf-8"));
  }
  return null
}

;(async () => {
     let totalNewTokens = 0;
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

      if (notExistsTokens.length) {
        await new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      }
      // console.log(
      //   "localAssets",
      //   localAssets.map((_) => _.raw)
      // );

      const existsTokens = localAssets.filter((_) => _.raw).map((_) => _.raw);
      const fetchedAssets = notExistsTokens.length
        ? await fetchAssets(
            notExistsTokens.map((_) => _.tokenId),
            collectionAddr
          )
        : [];
    


      totalNewTokens += fetchedAssets.length;
      const assets = [].concat(existsTokens, fetchedAssets);
        // console.log({
        //   fetchedAssets: fetchedAssets.length,
        //   existsTokens: existsTokens.length,
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

      
    }

    dataCollection.tokens = dataCollection.tokens.map((_) => {
      const meta = tokensMeta.find((c) => _.tokenId === c.tokenId) || {};
      return {
        ...meta,
        ..._,
      };
    });

    // console.log(dataCollection);
    fs.writeFileSync(
      `${allBaseDir}/collections/${collectionAddr}.json`,
      JSON.stringify(dataCollection)
    );

    const recentTokens = allTokens.sort(
      (a, b) =>
        moment(b.first_time).toDate().getTime() -
        moment(a.first_time).toDate().getTime()
    );

    fs.writeFileSync(
      `${allBaseDir}/recentTokens.json`,
      JSON.stringify(recentTokens.slice(0, 100).map(_ => {
        _.detail = getTokenDetail(_.contract_address, _.tokenId);
        return _;
      }))
    );
  }
  console.log("done", { totalNewTokens });
})();
// console.log(topCollections.slice(0, 100));


