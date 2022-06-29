// const recentTokens = require("./data/v1/recentTokens.json");
const moment = require("moment");
const posted = require("./posted");
const fetch = require("node-fetch");
const fs = require("fs");
const { IFTT } = require('./config.json')

function getTokens() {
  const recentTokens = JSON.parse(
    fs.readFileSync("./data/v1/recentTokens.json", "utf-8")
  );
  const tokens = recentTokens
    .filter((_) => _.detail)
    .slice(0, 50)
    .map((_) => {
      _.floorPrice = parseFloat(_.collection.floorPrice);
      return _;
    })
    .filter((_) => {
      return _.floorPrice > 0.3;
    })
    .sort((a, b) => b.floorPrice - a.floorPrice)
    .map((_) => {
      const { collection, senders, receivers } = _;
      const collectionTag = collection.name.split(" ")[0];
      const floorPrice = parseFloat(_.collection.floorPrice);
      const slug = collection.slug.split("-").join("");
      const isSame = collectionTag.toLowerCase() === slug.toLowerCase();
      return {
        id: `${_.contract_address}:${_.tokenId}`,
        image: _.detail.image_url,
        slug,
        floorPrice,
        tokenId: _.tokenId,
        fromDate: moment(_.first_time).fromNow(),
        collection: collection.name,
        tweet: `🚨 ${collection.name} #${
          _.tokenId
        } may have been stolen, details: https://explorer.scamsniffer.io/assets/${
          _.contract_address
        }/${_.tokenId}?utm_source=scamsniffer-bot

from: ${senders[0]}
to: ${receivers[0]}

#ScamAlert ${
          isSame ? `#${slug}` : `#${slug} #${collectionTag}`
        } #NFT #NFTCommunity #ETH #NFTs #opensea #NFTProject #nftcollectors #NFTCollection`,
      };
    });

    return tokens;
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

async function sendPost(tweet, image) {
  const evetData = {
    value1: "",
    value2: tweet,
    value3: image,
  };
  // console.log("evetData", evetData);
  const req = await fetch(
    "https://maker.ifttt.com/trigger/send/with/key/" + IFTT,
    {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evetData),
      method: "POST",
    }
  );
  console.log(await req.text());
}

async function getNeedPostTweet() {
  const tokens = getTokens();
  let lastToken = null
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (posted.indexOf(token.id) > -1) {
      continue;
    }
    lastToken = token;
    break;
  }
  return lastToken;
}

(async () => {
  for (let index = 0; index < Infinity; index++) {
    const token = await getNeedPostTweet();
    if (token) {
      console.log("send", token);
      // break;
      try {
        await sendPost(token.tweet, token.image);
        posted.push(token.id);
        fs.writeFileSync("./posted.json", JSON.stringify(posted));
      } catch(e) {
        console.log('failed', e)
      }
      await wait(60 * 1000 * 30);
    }
    await wait(10 * 1000);
  }
})();
