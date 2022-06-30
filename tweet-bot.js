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
    .slice(0, 60)
    .map((_) => {
      const { first_time, senders } = _;
      _.floorPrice = parseFloat(_.collection.floorPrice);
      const fromUser = senders[0];
      const eventId = `${_.contract_address}:${fromUser}`;
      _.eventId = eventId;
      return _;
    })
    .sort((a, b) => b.floorPrice - a.floorPrice)
    .reduce((merged, item) => {
      const existEvent = merged.find((_) => _.eventId === item.eventId);
      if (existEvent) {
        existEvent.otherTokens.push(item.tokenId);
        existEvent.totalValue = (existEvent.otherTokens.length * item.floorPrice);
      } else {
        item.otherTokens = [item.tokenId];
        item.totalValue = item.floorPrice;
        merged.push(item);
      }
      return merged;
    }, [])
    .filter((_) => {
      return _.totalValue > 2;
    })
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((_) => {
      const { collection, first_time, senders, receivers } = _;
      const collectionTag = collection.name.split(" ")[0];
      const floorPrice = parseFloat(_.collection.floorPrice);
      const slug = collection.slug.split("-").join("");
      const isSame = collectionTag.toLowerCase() === slug.toLowerCase();
      const fromUser = senders[0];
      return {
        id: `${_.contract_address}:${_.tokenId}`,
        image: _.detail.image_url,
        slug,
        floorPrice,
        otherTokens: _.otherTokens,
        tokenId: _.tokenId,
        totalValue: _.totalValue,
        fromDate: moment(_.first_time).fromNow(),
        collection: collection.name,
        tweet: `🚨 ${collection.name} #${_.otherTokens
          .slice(0, 3)
          .join(" #")} ${_.otherTokens.length > 3 ? '...': ''} ${
          _.otherTokens.length
        } tokens worth ${_.totalValue.toFixed(
          0
        )}Ξ, may have been stolen, details: https://explorer.scamsniffer.io/assets/${
          _.contract_address
        }/${_.tokenId}?utm_source=scamsniffer-bot
from: ${senders[0]}
to: ${receivers[0]}
#ScamAlert ${
          isSame ? `#${slug}` : `#${slug} #${collectionTag}`
        } #NFT #NFTCommunity #ETH #NFTs`,
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
    try {
      const token = await getNeedPostTweet();
      console.log("token", token);
      if (token) {
        //  posted.push(token.id);
        // console.log("send", token);
        // continue;
        // break;
        try {
          await sendPost(token.tweet, token.image);
          posted.push(token.id);
          fs.writeFileSync("./posted.json", JSON.stringify(posted));
        } catch(e) {
          console.log('failed', e)
        }
        await wait(60 * 1000 * 60 * 6);
      }
    } catch(e) {
      console.log('error', e)
    }
    await wait(10 * 1000);
  }
})();

