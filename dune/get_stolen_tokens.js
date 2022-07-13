const { getStolenTokensByLinkAddress, getLinkedAddress } = require("./index");
const fs = require("fs");
const {API} = require('../config.json')
const fetch = require('node-fetch');

async function getRemoteDatabase() {
  const req = await fetch(
    "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/master/src/config.json"
  );
  const json = await req.json();
  return json;
}

async function getNewDomains(lastId = 39) {
  const req = await fetch(`${API}/domainSummary?sort=-id&needReport=1&limit=1000`);
  const allDomains = await req.json();
  const newId = allDomains[0].id;
  return allDomains.filter((_) => _.id > lastId).map((_) => _.host);
}

async function getDetectHistory(host) {
  const req = await fetch(
    `${API}/detectHistory?fields=actions,linkAddress&limit=100&host=` +
      host
  );
  const list = await req.json();
  return {
    host,
    transferETH: [],
    approve: Array.from(
      new Set(
        list
          .map((_) => {
            if (
              _.linkAddress &&
              ["setApprovalForAll", "safeTransferFrom", "transferETH"].indexOf(
                _.actions
              ) > -1
            ) {
              return _.linkAddress;
            }
          })
          .filter((_) => _)
      )
    ),
  };
}


async function getRecentScamActivity() {
  const req = await fetch(
    `${API}/scamActivity?sort=-id&limit=300&fields=address`
  );
  const list = await req.json();
  let allAddressList = []
  list
    .map((_) => {
      const list = _.address.split(",");
      allAddressList = allAddressList.concat(list);
    })

  return Array.from(new Set(allAddressList));
}

async function genLinkerAddressList(lastId = 1) {
  const cacheFile = __dirname + "/address_list_cache.json";
  if (fs.existsSync(cacheFile)) {
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    const isNotTimeout = Date.now() - cacheData.saveTime < 60 * 1000 * 20;
    if (isNotTimeout) {
      return cacheData;
    }
  }
  // const newDomains = await getNewDomains(lastId);
  // const allAttackers = await getRecentScamActivity();
  // for (let index = 0; index < newDomains.length; index++) {
  //   const newDomain = newDomains[index];
  //   const historyWatch = await getDetectHistory(newDomain);
  //   if (historyWatch.approve.length) {
  //     console.log(historyWatch);
  //     allAttackers.push(historyWatch);
  //   }

  //   if (historyWatch.transferETH.length) {
  //     console.log(historyWatch);
  //     allAttackers.push(historyWatch);
  //   }
  // }
  const allList = await getRecentScamActivity();
  // const allList = Array.from(
  //   allAttackers.reduce((all, item) => {
  //     item.approve.forEach((addr) => {
  //       all.add(addr);
  //     });
  //     item.transferETH.forEach((addr) => {
  //       all.add(addr);
  //     });
  //     return all;
  //   }, new Set())
  // );
  // const allAttackersFiles = __dirname + "/allAttackers.json";
  // fs.writeFileSync(allAttackersFiles, JSON.stringify(allAttackers, null, 2));
  const listData = await getLinkedAddress(allList);
  listData.saveTime = Date.now();
  console.log("listData", listData);
  fs.writeFileSync(cacheFile, JSON.stringify(listData, null, 2));
  return listData;
}

async function genReport(lastId = 1) {
  const { linkers, allReceivers } = await genLinkerAddressList();
  const linkerFile = __dirname + "/linkers.json";
  const reportFile = __dirname + "/stolen_tokens_new.json";
  fs.writeFileSync(linkerFile, JSON.stringify(linkers));
  const report = await getStolenTokensByLinkAddress(allReceivers);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
}


genReport(2);
