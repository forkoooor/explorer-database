const link_receiver_query = `WITH
  all_hackers AS (
    select
      b."to" as receiver
    from
      erc721."ERC721_evt_Transfer" b
      left join ethereum.transactions as a on a.hash = b.evt_tx_hash
    where
      a."from" = CONCAT(
        '\\x',
        substring(
          '{{contract}}'
          from
            3
        )
      ):: bytea -- Allow user to input 0x... format and convert to \\x... format
      and a."to" != '\\x00000000006c3852cbef3e08e8df289169ede581'
    group by
      b."to"
    union
    select
      b."to" as receiver
    from
      erc721."ERC721_evt_Transfer" b
      left join ethereum.transactions as a on a.hash = b.evt_tx_hash
    where
      a."to" = CONCAT(
        '\\x',
        substring(
          '{{contract}}'
          from
            3
        )
      ):: bytea -- Allow user to input 0x... format and convert to \\x... format
    group by
      b."to"
  )
 
select * from all_hackers
`;


const recent_lost_query = `select
"from",
"to",
b.name,
 date_trunc('day', evt_block_time) AS DAY,
labels.get("from", 'ens name reverse') as ens_name,
count(distinct("tokenId")) as counts 
from  erc721."ERC721_evt_Transfer" a
left join nft."tokens" as b on b.contract_address = a.contract_address
WHERE "to" in (
ADDRESS_LIST
) 
and b.name in ( 'CryptoPunks',
    'Bored Ape Yacht Club',
    'Mutant Ape Yacht Club',
    'Otherdeed for Otherside',
    'Art Blocks Curated',
    'Azuki',
    'CLONE X - X TAKASHI MURAKAMI',
    'Decentraland',
    'The Sandbox',
    'Moonbirds',
    'Doodles',
    'Meebits',
    'Cool Cats NFT',
    'Rarible',
    'Bored Ape Kennel Club',
    'Loot (for Adventurers)',
    'CryptoKitties',
    'CrypToadz by GREMPLIN',
    'World of Women',
    'SuperRare',
    'Parallel Alpha',
    'Art Blocks Playground',
    'BEANZ Official',
    'Bored Ape Chemistry Club',
    'Pudgy Penguins',
    'HAPE PRIME',
    'VeeFriends',
    'RTFKT - MNLTH',
    'Art Blocks Factory',
    'Decentraland Wearables',
    'Sorare',
    'NFT Worlds',
    '0N1 Force',
    'MekaVerse',
    'Murakami.Flowers Seed',
    'ZED RUN Legacy',
    'Fidenza by Tyler Hobbs',
    'PXN: Ghost Division',
    'adidas Originals Into the Metaverse',
    'Karafuru',
    'Hashmasks',
    'Invisible Friends',
    'mfers',
    'My Curio Cards',
    'RTFKT - CloneX Mintvial',
    'Okay Bears',
    'Creature World',
    'FLUF World',
    'PhantaBear',
    '3Landers',
    'Emblem Vault [Ethereum]',
    'CyberKongz VX',
    'CyberBrokers',
    'ENS: Ethereum Name Service',
    'CyberKongz (Babies)',
    'LOSTPOETS',
    'Prime Ape Planet PAP',
    'Cool Pets NFT',
    'The Doge Pound',
    'Lazy Lions',
    'Pixel Vault MintPass',
    'Kaiju Kingz',
    'DeadFellaz',
    'Creepz Genesis',
    'World of Women Galaxy',
    'Town Star',
    'Axie Infinity',
    'alien frens',
    'MyCryptoHeroes',
    'Ringers by Dmitri Cherniak',
    'Somnium Space VR',
    'goblintown.wtf',
    'CyberKongz',
    'VeeFriends Series 2',
    'Voxels (formerly Cryptovoxels)',
    'Metroverse Genesis',
    'VOX Collectibles',
    'Capsule House',
    'Worldwide Webb Land',
    'PUNKS Comic',
    'Psychedelics Anonymous Genesis',
    'SupDucks',
    'Gutter Cat Gang',
    'Lives of Asuna',
    'Sneaky Vampire Syndicate',
    'Wolf Game',
    'Killer GF',
    'Adam Bomb Squad',
    'CryptoSkulls',
    'Treeverse',
    '888 inner circle',
    'MURI by Haus',
    'NeoTokyo Outer Identities',
    'Autoglyphs',
    'Impostors Genesis Aliens',
    'Ragnarok Meta',
    'Damien Hirst - The Currency',
    'JUNGLE FREAKS GENESIS',
    'MoonCats',
    'GalacticApes',
    'Arcade Land',
    'Rumble Kong League',
    'oncyber labs',
    'Meridian by Matt DesLauriers',
    'CryptoPunks V1 (wrapped)',
    'CryptoBatz by Ozzy Osbourne',
    'tubby cats',
    'VOX Collectibles: Mirandus',
    'Project NANOPASS',
    'MutantCats',
    'MakersPlace',
    'PROOF Collective',
    'MetaHero Universe: Generative Identities',
    'Robotos',
    'Chromie Squiggle by Snowfro',
    'KIWAMI Genesis',
    'JRNY Club',
    'Anonymice',
    'Boss Beauties',
    'HYPEBEARSCLUB.OFFICIAL',
    'FULL SEND METACARD NFT',
    'Pixelmon - Generation 1',
    'Bears Deluxe Old',
    'Galaxy-Eggs',
    'My Pet Hooligan',
    'Treeverse Plots',
    'RaidParty Heroes',
    'DEGEN TOONZ COLLECTION',
    'Neo Tokyo Identities',
    'Mirandus',
    'RaidParty Fighters',
    'Forgotten Runes Wizards Cult',
    'CryptoMories',
    'C-01 Official Collection',
    'Wolf Game Legacy',
    'Quirkies Originals',
    'hausphases by Haus',
    'Crypto Bull Society',
    'Fragments of an Infinite Field by Monica Rizzolli',
    'Koala Intelligence Agency',
    'Frontier Game',
    'ZombieClub Token',
    'Chain Runners',
    'OxyaOriginProject',
    'Crypto.Chicks',
    'Murakami.Flowers Official',
    'THE SHIBOSHIS',
    'The Heart Project',
    'The Humanoids',
    'The Sevens - Genesis',
    'Creepz Shapeshifterz',
    'Decentral Games ICE Poker',
    '"MOAR" by Joan Cornella',
    'DeGods',
    'inBetweeners by GianPiero',
    'PEACEFUL GROUPIES',
    'PREMINT Collector Pass - OFFICIAL',
    'Akutars',
    'MetaHero Universe: United Planets',
    'IO: Imaginary Ones',
    'FVCK_CRYSTAL//',
    'Desperate ApeWives',
    'OnChainMonkey',
    'Wizards & Dragons Game (WnD)',
    'The CryptoDads',
    'Tasty Bones XYZ',
    'Ape Kids Club (AKC)',
    'Archetype by Kjetil Golid',
    'Animetas',
    'the littles NFT',
    'Rug Radio - Genesis NFT',
    'DourDarcels',
    'Tom Sachs: Rocket Factory - Components',
    'The n project',
    'Smilesss',
    'Crypto Unicorns Market',
    'WonderPals',
    'Blitmap',
    'GEN.ART Membership',
    'Creepz Reptile Armoury',
    'ASM AIFA Genesis',
    'The Meta Key',
    'ALPACADABRAZ',
    'TIMEPieces Build a Better Future: Genesis Drop',
    'MoodRollers by Lucas Zanotto',
    'Akuma Origins',
    'Geometry Runners by Rich Lord',
    'SlimHoods',
    'SUPERPLASTIC: Cryptojankyz',
    'Neo Tokyo Part 2 Vault Cards',
    'Trippin’ Ape Tribe',
    'Edenhorde',
    '10KTF',
    'Cool Monkes Genesis',
    'Sappy Seals',
    'Chimpers',
    'The Sandbox ASSETS',
    'The Wicked Craniums',
    'Wassies by Wassies',
    'Wrapped Cryptopunks',
    'NFT Bored Bunny',
    'Antonym: GENESIS',
    'Bloot (not for Weaks)',
    'GNSS by MGXS',
    'Winter Bears',
    'Shinsekaicorp',
    'GEVOLs',
    'Gutter Juice',
    'CatBlox Genesis Collection',
    'The Art of Seasons',
    'phase by Loren Bednar',
    'EightBit Me',
    'Crypto Coven',
    'Starcatchers',
    'FishyFam',
    'Everai Heroes: Duo',
    'Dippies',
    'Flyfish Club',
    'RTFKT X NIKE MONOLITH',
    'X Rabbits Club',
    '(B)APETAVERSE',
    'Milady Maker',
    'The Vogu Collective',
    'THE META KONGZ KLAYTN',
    'Metasaurs by Dr. DMT',
    'Pigments by Darien Brito',
    'KnownOrigin',
    'Skulptuur by Piter Pasma',
    'Boki',
    'Acrocalypse',
    'Galaxy Fight Club',
    'Apocalyptic Apes',
    'Stoner Cats',
    'Wicked Ape Bone Club',
    'BASTARD GAN PUNKS V2',
    'ASM Brains',
    'Nifty League DEGENs',
    'Cupcats Official',
    'PartyBear',
    'T-O-S The Other Side',
    'TBAC',
    'Wrapped MoonCatsRescue - Unofficial',
    'Swampverse',
    'Deafbeef',
    'VaynerSports Pass VSP',
    'Party Ape Billionaire Club',
    'MekaApes Game by OogaVerse',
    'More Than Gamers | MTG',
    'Habbo Avatars',
    'Akutar Mint Pass',
    'Genesis Critterz',
    'FoxFam',
    'NeoTokyo Citizens',
    'XCOPY',
    'FOMO MOFOS',
    'The Doggies (Snoop Dogg)',
    'FLUF World: Burrows',
    'Little Lemon Friends',
    'Voxies',
    'Monster Ape Club | MAC',
    'Ape Gang Unmigrated',
    'Shiba Social Club Official Collection',
    'Ecumenopolis by Joshua Bagley',
    'CryptoDickbutts',
    'Ghxsts',
    'Loser Club Official',
    'Gray Boys',
    'Boonji Project',
    'Subscapes by Matt DesLauriers',
    'Los Muertos World',
    'Llamaverse Genesis',
    'dotdotdots',
    'HOWLERZ',
    'Gutter Rats',
    'BYOPill',
    'Wolf Game - Wool Pouch',
    'Sipherian Surge',
    'SuperFarm Genesis Series',
    'Cets on Creck',
    '10KTF Stockroom',
    'GENE_SIS: The Girls of Armament',
    'DystoPunks',
    'Fang Gang',
    'HeadDAO',
    'BEEPLE: EVERYDAYS - THE 2020 COLLECTION',
    'SUPERPLASTIC: SUPERGUCCI',
    'Cryptoon Goonz',
    'Al Cabones',
    'KCG',
    'WVRPS by WarpSound (Official)',
    'SpacePunksClub',
    'CryptoArte',
    'WomenRise',
    '1111 by Kevin Abosch',
    'RTFKT x Nike Dunk Genesis CRYPTOKICKS',
    'Gooniez Gang Official')
and a."evt_block_time" > now() - interval '7 days'
group by "from", "to", b.name, DAY
order by counts desc
`;



const recent_tokens_v1 = `
select
  contract_address,
  "tokenId"::TEXT,
  string_agg("to"::TEXT, ';;') as receivers,
  string_agg("from"::TEXT, ';;') as senders,
  min(evt_block_time) as first_time
from
  erc721."ERC721_evt_Transfer"
WHERE
  "to" in (
   ADDRESS_LIST
  )
  and contract_address in (
    COLLETION_LIST
)

and "evt_block_time" > now() - interval '70 days'
group by
  1,
  2`;


const recent_tokens_v2 = `
select
  contract_address,
  b."tokenId":: TEXT,
  string_agg(b."to":: TEXT, ';;') as receivers,
  string_agg(b."from":: TEXT, ';;') as senders,
  min(b.evt_block_time) as first_time
from
  erc721."ERC721_evt_Transfer" b
  left join ethereum.transactions as a on a.hash = b.evt_tx_hash
WHERE
  (
    b."to" in (
      ADDRESS_LIST
    )
    or a."from" in (
      ADDRESS_LIST
    )
  )
  and contract_address in (
    COLLETION_LIST
  )
  and "evt_block_time" > now() - interval '70 days'
group by
  1,
  2
`;


const recent_tokens = `
select
  contract_address,
  b."tokenId":: TEXT,
  string_agg(b."to":: TEXT, ';;') as receivers,
  string_agg(b."from":: TEXT, ';;') as senders,
  min(b.evt_block_time) as first_time
from
  erc721."ERC721_evt_Transfer" b
  left join ethereum.transactions as a on a.hash = b.evt_tx_hash
WHERE
  b."to" in (
    ADDRESS_LIST
  )
  and contract_address in (
    COLLETION_LIST
  )
  and "evt_block_time" > now() - interval '7 days'
group by
  1,
  2
`;


const recent_tokens_from = `
select
  contract_address,
  b."tokenId":: TEXT,
  string_agg(b."to":: TEXT, ';;') as receivers,
  string_agg(b."from":: TEXT, ';;') as senders,
  min(b.evt_block_time) as first_time
from
  erc721."ERC721_evt_Transfer" b
  left join ethereum.transactions as a on a.hash = b.evt_tx_hash
WHERE
  a."from" in (
    ADDRESS_LIST
  )
  and contract_address in (
    COLLETION_LIST
  )
  and b."evt_block_time" > now() - interval '7 days'
group by
  1,
  2
`;

module.exports = {
  link_receiver_query,
  recent_lost_query,
  recent_tokens_v2,
  recent_tokens,
  recent_tokens_from
};
