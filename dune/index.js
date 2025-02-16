const { recent_lost_query, recent_tokens, recent_tokens_v2, recent_tokens_from } = require("./query_template");
const { excuteQuery, updateQuery, reqSession } = require("./core");
const { rankCollections } = require("./rank");
const fs = require('fs');
const allExistReceivers = require('./receivers.json');
const topCollections =  require('../top.json');

const topCollectionsList = topCollections
  .filter((_) => _.contract)
  .map((_) => {
    return _.contract.address;
  });



async function lookupRecentTokensByQuery(receivers, query_id, query_sql) {
  console.log("lookupRecentTokensByQuery", receivers.length);
  await reqSession();
  const querySql = query_sql
  .replace(
    new RegExp('ADDRESS_LIST', 'g'),
    receivers.filter(c => c).map((_) => `'${_.trim()}'`).join(",\n")
  )
  .replace(
    new RegExp('COLLETION_LIST', 'g'),
    topCollectionsList
      .map((_) => `'${_.replace("0x", "\\x").trim()}'`)
      .join(",\n")
  )
    const upRes = await updateQuery(
    querySql,
    query_id
  );
  if (!upRes.data) console.log('updateQuery failed', upRes)
  await new Promise((resolve) => {
    setTimeout(resolve, 800);
  });

  // console.log("query", querySql);
  const result = await excuteQuery(query_id);
  // console.log("query done", result.data);
  const rows = result.data.get_result_by_job_id
    .map((_) => _.data)
    .map((_) => {
      _.contract_address = _.contract_address.replace("\\", "0");
      _.receivers = _.receivers.split(";;").map((c) => c.replace("\\", "0"));
      _.senders = _.senders.split(";;").map((c) => c.replace("\\", "0"));
      return _;
    });
  console.log('tokens', rows.length);
  return rows;
}

async function lookupRecentTokens(receivers, query_id = 966061) {
  console.log("lookupRecentTokens", receivers.length);
  const allIds = new Set();
  const toToken = await lookupRecentTokensByQuery(receivers, query_id, recent_tokens)
  const fromToken = await lookupRecentTokensByQuery(receivers, query_id, recent_tokens_from)
  const allTokens = [];
  [toToken, fromToken].forEach(results => {
    results.forEach(token => {
      if (!allIds.has(token.tokenId+token.contract_address)) {
        allTokens.push(token);
        allIds.add(token.tokenId+token.contract_address)
      }
    })
  })
  console.log('allTokens', allTokens.length)
  return allTokens;
}

async function lookupRecentAttack(receivers, linkers, query_id = 896859) {
  await reqSession();
  await updateQuery(
    recent_lost_query.replace(
      "ADDRESS_LIST",
      receivers.map((_) => `'${_.trim()}'`).join(",\n")
    ),
    query_id
  );
  await new Promise((resolve) => {
    setTimeout(resolve, 800);
  });
  const result = await excuteQuery(query_id);
  const rows = result.data.get_result_by_job_id
    .map((_) => _.data)
    .map((_) => {
      const collection_rank = rankCollections.find((c) => c.name === _.name);
      _.rank = 300 - collection_rank.rank;
    //   _.collection_detail = collection_rank;
      _.floorPrice = collection_rank.floorPrice;
      _.lostValue = collection_rank.floorPrice * _.counts;
      _.from = _.from.replace('\\', '0')
      return _;
    })
    .sort((a, b) => b.lostValue - a.lostValue);
  console.log(rows);
  const summary = {
      linkers,
    attack_receivers: receivers,
    totalLostValueInETH: rows.reduce((t, i) => t + i.lostValue, 0),
    totalTokens: rows.reduce((t, i) => t + i.counts, 0),
    topLostCollections: Object.values(
      rows.reduce((all, item) => {
        const name = item.name;
        all[name] = all[name] || {
          name,
          lostValue: 0,
          tokens: 0,
          victims: new Set(),
        };
        all[name].lostValue += item.lostValue;
        all[name].tokens += item.counts;
        all[name].victims.add(item.from);
        return all;
      }, {})
    )
      .sort((a, b) => b.lostValue - a.lostValue).map(_ => {
        _.victims = Array.from(_.victims);
        return _
      })
      .slice(0, 10),
    victim: Object.values(
      rows.reduce((all, item) => {
        const { from: user, ens_name } = item;
        all[user] = all[user] || {
          user,
          ens_name,
          lostValue: 0,
          details: [],
        };
        all[user].lostValue += item.lostValue;
        all[user].details.push(item);
        return all;
      }, {})
    )
      .sort((a, b) => b.lostValue - a.lostValue)
      .slice(0, 100),
  };
//   console.log(JSON.stringify(summary, null, 2));
//   fs.writeFileSync("summary.json", JSON.stringify(summary, null, 2));
  return summary;
}

async function getLinkReceivers(attackerAddress, query_id = 1150766) {
  await reqSession();
  const result = await excuteQuery(query_id, [
    {
      key: "contract",
      type: "text",
      value: attackerAddress,
    },
  ]);
  console.log(result.errors, attackerAddress);
  if (result.errors) return [];
  const rows = result.data.get_result_by_job_id.map((_) => _.data.receiver);
  //   console.log(rows);
  return rows;
}

async function getLinkedAddress(linkAddressList) {
  const allReceivers = new Set();
  const linkers = {};
  for (let index = 0; index < linkAddressList.length; index++) {
    const linkAddress = linkAddressList[index];
    console.log('scan', index, linkAddress)
    const receivers = await getLinkReceivers(linkAddress);

    if (receivers.length < 30) {
      receivers.forEach((_) => {
        if (allReceivers.has(_)) {
          console.log("exists", _);
        }
        linkers[_] = linkAddress;
        allReceivers.add(_);
      });
    } else {
      console.log('too large')
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    })

    allReceivers.add(linkAddress.toLowerCase().replace('0x', '\\x'));
    console.log(linkAddress, receivers);
  }
  // fs.writeFileSync(__dirname + "/linkers.json", JSON.stringify(linkers));
  allExistReceivers.forEach((_) => {
    allReceivers.add(_);
  });
  // console.log(Array.from(allReceivers).length, allExistReceivers.length);
  return {
    linkers,
    allReceivers: Array.from(allReceivers),
  };
}


async function getStolenTokensByLinkAddress(allReceivers) {
  const summary = await lookupRecentTokens(allReceivers);
  return summary;
}

async function getReportByLinkAddress(linkAddressList) {
    const allReceivers = new Set();
    const linkers = {};
    for (let index = 0; index < linkAddressList.length; index++) {
      const linkAddress = linkAddressList[index];
      const receivers = await getLinkReceivers(linkAddress);
      receivers.forEach((_) => {
        if (allReceivers.has(_)) {
          console.log("exists", _);
        }
        linkers[_] = linkAddress;
        allReceivers.add(_);
      });
      console.log(linkAddress, receivers);
    }
    console.log(Array.from(allReceivers).length)
    const summary = await lookupRecentAttack(Array.from(allReceivers), linkers);
    return summary;
}

async function test() {
    const linkAddressList = [
      "0xD23E368689ad3FaBa1817D220A56068e9527B600",
      "0xCc0b488dba202Cb0945DF6c49a1EDd69705Cb2b8",
      "0x92c582a59582AE1C150e69125b2Ea08e7594b6c9",
      "0x2cBAc16b230dd3bFA0463785977EA0Ef954C4Bde",
      "0x2F35C7983D7BD79fbaB2c58C684CD050C41AbBA8",
      "0x4DBa22C61B8818c94dE797680840d25B1E2623B4",
      "0x880693f6fa17395914a9C6f280f6aF6eEC6Ea195",
      "0x7e4384AD48860AE13107b8c8A2B877191edFe2a6",
      "0x4721FCf90fE83F86bfFa4e5f224694299b075c32",
      "0x73a6c0b87197d1306d4867bd3043C30DEa622c9d",
      "0x4c3C6fda65cec9Fe3Fe341e3c494811207Af8Ba3",
      "0x40881dD5B6482854Fc01d010ed99fd346f0608B1",
    ];
  const allReceivers = new Set()
  const linkers = {};
  for (let index = 0; index < linkAddressList.length; index++) {
    const linkAddress = linkAddressList[index];
    const receivers = await getLinkReceivers(linkAddress);
    receivers.forEach(_ => {
        if (allReceivers.has(_)) {
            console.log('exists', _)
        }
        linkers[_] = linkAddress;
        allReceivers.add(_)
    })
    console.log(linkAddress, receivers);
  }
  console.log("receivers", Array.from(allReceivers).length, linkers);
  await lookupRecentTokens(Array.from(allReceivers));
}

// test();


module.exports = {
  getLinkedAddress,
  getStolenTokensByLinkAddress,
  getReportByLinkAddress,
};