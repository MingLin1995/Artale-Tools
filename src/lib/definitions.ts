export const jobClasses: string[] = [
  '龍騎', '十字', '騎士', '鏢賊', '刀賊', '弓手', '弩手', '冰雷', '火毒', '祭司', '打手', '槍手'
];

export const roleDefinitions = {
  singleMage: ['冰雷', '火毒'], // 單法
  dualMage: ['冰雷', '火毒'], // 雙法
  priest: ['祭司'],
  ballClearSupport: ['刀賊', '鏢賊'],
  dragonKnight: ['龍騎'],
};

export type JobClass = typeof jobClasses[number];
export type Role = keyof typeof roleDefinitions;
