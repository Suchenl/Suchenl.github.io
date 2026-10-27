import taxonomy from '../../../knowledge/taxonomy.json';

// Shared source for the server-side Research assembly and client-side directory.
export const domainCatalog = taxonomy.domains;
export const contentTypes = taxonomy.contentTypes;
export const typeLabel: Record<string, string> = Object.fromEntries(
  contentTypes.map(item => [item.id, item.label])
);
export function domainMatches(domains: string[] | undefined, domain: string): boolean {
  return (domains || []).some(candidate => candidate === domain || candidate.startsWith(domain + '/'));
}
export function domainTitle(domain: string): string {
  return domain.split('/').join(' / ');
}
export const legacyCategoryRoots: Record<string, string> = {
  '强化学习与 Agent': '大模型与强化学习',
  '大模型基础': '大模型与强化学习',
  '推理模型与推理时计算': '大模型与强化学习/推理与 Agent 系统',
  '生成模型': '多模态学习与生成',
  '多模态理解': '多模态学习与生成',
  '多模态大模型': '多模态学习与生成',
  '机器人与具身智能': '机器人与具身智能',
  '世界模型': '世界模型与环境交互',
  '数值表示与 Tokenization': '大模型与强化学习/预训练与模型架构',
};
