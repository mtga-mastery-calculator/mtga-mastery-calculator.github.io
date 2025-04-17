
export type Rewards = Array<Array<[number, string, string]>>;
export interface Set {
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  maxLevel?: number;
  rewards?: Rewards;
}
export const sets: Set[] = [
  {
    code: "LCI",
    name: "Lost Caverns of Ixalan",
    startDate: new Date("2023-11-14T17:00:00Z"),
    endDate: new Date("2024-02-06T13:00:00Z"),
    maxLevel: 90,
    rewards: require("./data/rewardsLCI.json"),
  },
  {
    code: "MKM",
    name: "Murders at Karlov Manor",
    startDate: new Date("2024-02-06T17:00:00Z"),
    endDate: new Date("2024-04-16T13:00:00Z"),
    maxLevel: 70,
    rewards: require("./data/rewardsMKM.json"),
  },
  {
    code: "OTJ",
    name: "Outlaws of Thunder Junction",
    startDate: new Date("2024-04-16T17:00:00Z"),
    endDate: new Date("2024-07-30T13:00:00Z"),
    maxLevel: 110,
    rewards: require("./data/rewardsOTJ.json"),
  },
  {
    code: "BLB",
    name: "Bloomburrow",
    startDate: new Date("2024-07-30T17:00:00Z"),
    endDate: new Date("2024-09-24T13:00:00Z"),
    maxLevel: 60,
    rewards: require("./data/rewardsBLB.json"),
  },
  {
    code: "DSK",
    name: "Duskmourn: House of Horror",
    startDate: new Date("2024-09-24T17:00:00Z"),
    endDate: new Date("2024-11-12T13:00:00Z"),
    maxLevel: 60,
    rewards: require("./data/rewardsDSK.json"),
  },
  {
    code: "FDN",
    name: "Foundations",
    startDate: new Date("2024-11-12T17:00:00Z"),
    endDate: new Date("2025-02-11T13:00:00Z"),
    maxLevel: 90,
    rewards: require("./data/rewardsFDN.json"),
  },
  {
    code: "DFT",
    name: "Aetherdrift",
    startDate: new Date("2025-02-11T17:00:00Z"),
    endDate: new Date("2025-04-08T13:00:00Z"),
    maxLevel: 60,
    rewards: require("./data/rewardsDFT.json"),
  },
  {
    code: "TDM",
    name: "Tarkir: Dragonstorm",
    startDate: new Date("2025-04-08T17:00:00Z"),
    endDate: new Date("2025-06-10T13:00:00Z"),
    maxLevel: 70,
    rewards: require("./data/rewardsTDM.json"),
  },
  {
    code: "FIN",
    name: "Final Fantasy",
    startDate: new Date("2025-06-10T17:00:00Z"),
    endDate: new Date("2025-07-29T13:00:00Z"),
  },
  {
    code: "EOE",
    name: "Edge of Eternities",
    startDate: new Date("2025-07-29T17:00:00Z"),
    endDate: new Date("2025-09-23T13:00:00Z"),
  },
  {
    code: "SPM",
    name: "Marvel's Spider-Man",
    startDate: new Date("2025-09-23T17:00:00Z"),
    endDate: new Date("2025-11-18T13:00:00Z"),
  }
];
