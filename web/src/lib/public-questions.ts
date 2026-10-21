import { getCollection } from 'astro:content';

// Explicit opt-in: only owner-approved research notes enter this public column.
export async function getPublicQuestions() {
  const entries = await getCollection('knowledge');
  return entries
    .filter((entry) => entry.id.startsWith('research/') && entry.data.publicQuestion === true)
    .map((entry) => ({
      id: entry.id,
      href: '/research/' + entry.id + '/',
      titleZh: entry.data.title || entry.id,
      titleEn: entry.data.questionTitleEn || entry.data.title || entry.id,
      summaryZh: entry.data.summaryZh || '',
      summaryEn: entry.data.questionSummaryEn || entry.data.summaryZh || '',
      date: entry.data.questionDate || '',
      kind: entry.data.questionKind === 'interest' ? 'interest' : 'question',
      evidence: entry.data.questionEvidence || [],
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
