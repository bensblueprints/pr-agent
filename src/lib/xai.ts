import type { Publication, ClientProfile, PubRecommendation } from '@/types';

const PROXY_BASE = '/api/chat/completions';

function getAuthToken(): string {
  const token = localStorage.getItem('pr_agent_token');
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function callXAI(system: string, user: string, temp = 0.5, maxTokens = 4096): Promise<string> {
  const response = await fetch(PROXY_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
    body: JSON.stringify({
      model: 'grok-4',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: temp,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Website Browsing ───────────────────────────────────────────

export async function browseWebsite(url: string): Promise<{ title: string; description: string; content: string; error?: string }> {
  const cleanUrl = url.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
  const domain = cleanUrl.split('/')[0];

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`https://r.jina.ai/http://${domain}`, { signal: controller.signal });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    if (!text || text.length < 30) throw new Error('Empty content');

    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : domain;

    const lines = text.split('\n').filter((l) => l.trim().length > 10);
    const description = lines.slice(0, 4).join(' ').substring(0, 600);

    return { title, description, content: text.substring(0, 3000) };
  } catch (err: any) {
    return {
      title: domain,
      description: `Website at ${domain}. Unable to fetch detailed content automatically.`,
      content: '',
      error: err.message || 'Fetch failed',
    };
  }
}

// ─── Discovery Chat ──────────────────────────────────────────

export async function discoveryChat(
  history: { role: string; text: string }[],
  message: string,
  website?: { title: string; description: string; content: string },
): Promise<{ response: string; profileComplete: boolean; extractedProfile?: Partial<ClientProfile> }> {
  const historyText = history.slice(-8).map((h) => `${h.role}: ${h.text}`).join('\n');

  const websiteSection = website?.content
    ? `\n\nWEBSITE CONTENT:\nTitle: ${website.title}\nDescription: ${website.description}\nContent excerpt: ${website.content.substring(0, 1500)}\n`
    : '';

  const system = `You are a senior PR strategist having a warm conversation with a client. Ask 1-2 questions at a time. Keep responses to 3-4 sentences. Be curious and professional.

Gather: website, product, industry, target audience, goals, unique selling points, tone.

When you have enough info, set profileComplete=true and extract all fields.

Respond ONLY with JSON: {"response":"...","profileComplete":false,"extractedProfile":{"websiteUrl":"","productDescription":"","industry":"","targetAudience":"","goals":"","uniqueSellingPoints":"","keyMessages":"","tone":""}}`;

  const userPrompt = `CONVERSATION:\n${historyText}\n\nCLIENT: "${message}"${websiteSection}\n\nContinue. Return ONLY JSON.`;

  try {
    const text = await callXAI(system, userPrompt, 0.7, 2048);
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/) || [null, text];
    const jsonStr = (match[1] || text).trim();
    const result = JSON.parse(jsonStr);
    return {
      response: result.response || text,
      profileComplete: !!result.profileComplete,
      extractedProfile: result.extractedProfile,
    };
  } catch {
    return {
      response: "Thanks for sharing! What's your website URL so I can learn more about what you offer?",
      profileComplete: false,
    };
  }
}

// ─── Recommendations ─────────────────────────────────────────

function compactPub(p: Publication): string {
  const flags: string[] = [];
  if (p.cbd) flags.push('cbd');
  if (p.health) flags.push('health');
  if (p.crypto) flags.push('crypto');
  if (p.gambling) flags.push('gambling');
  if (p.erotic) flags.push('erotic');
  if (p.indexed === 'Y') flags.push('idx');
  if (p.dofollow === 'Y') flags.push('df');
  return `${p.name}|${Math.round(p.price)}|${p.da}|${p.displayGenre}|${p.displayRegion}|${flags.join(',') || 'x'}`;
}

function filterPubs(message: string, pubs: Publication[]): Publication[] {
  const lower = message.toLowerCase();
  let budget = Infinity;

  const budgetMatch = message.match(/\$?([\d,]+(?:\.\d+)?)\s*(k|thousand)?/i);
  if (budgetMatch) {
    let val = parseFloat(budgetMatch[1].replace(/,/g, ''));
    if (budgetMatch[2]?.toLowerCase() === 'k' || budgetMatch[2]?.toLowerCase() === 'thousand') val *= 1000;
    if (val >= 100) budget = val;
  }

  const wantsCBD = /cbd|cannabis|hemp/.test(lower);
  const wantsHealth = /health|wellness|medical/.test(lower);
  const wantsCrypto = /crypto|bitcoin|blockchain/.test(lower);
  const wantsGambling = /gambling|casino|betting/.test(lower);
  const wantsErotic = /erotic|adult|xxx/.test(lower);

  const genreMap: Record<string, string[]> = {
    'News & Media': ['news', 'media'],
    'Technology': ['tech', 'software', 'app', 'ai'],
    'Business & Finance': ['business', 'finance', 'money', 'invest'],
    'Health & Wellness': ['health', 'wellness', 'fitness'],
    'Crypto & Blockchain': ['crypto', 'bitcoin', 'blockchain'],
    'Fashion & Beauty': ['fashion', 'beauty', 'style'],
    'Sports': ['sports'],
    'Gaming': ['gaming'],
    'Lifestyle': ['lifestyle'],
  };

  const targetGenres: string[] = [];
  for (const [g, keywords] of Object.entries(genreMap)) {
    if (keywords.some((k) => lower.includes(k))) targetGenres.push(g);
  }

  const regionMap: Record<string, string[]> = {
    'United States': ['us', 'usa', 'america'],
    'United Kingdom': ['uk', 'britain', 'england'],
    'Australia': ['australia'],
    'Canada': ['canada'],
    'California': ['california'],
    'New York': ['new york'],
    'UAE': ['uae', 'dubai'],
    'India': ['india'],
    'Global': ['global', 'worldwide'],
  };

  const targetRegions: string[] = [];
  for (const [r, keywords] of Object.entries(regionMap)) {
    if (keywords.some((k) => lower.includes(k))) targetRegions.push(r);
  }

  let filtered = pubs.filter((p) => {
    if (p.price > budget) return false;
    if (wantsCBD && !p.cbd) return false;
    if (wantsHealth && !p.health) return false;
    if (wantsCrypto && !p.crypto) return false;
    if (wantsGambling && !p.gambling) return false;
    if (wantsErotic && !p.erotic) return false;
    if (targetGenres.length > 0 && !targetGenres.includes(p.displayGenre)) return false;
    if (targetRegions.length > 0 && !targetRegions.some((r) => p.displayRegion.includes(r) || p.displayRegion === 'Global')) return false;
    return true;
  });

  if (filtered.length > 120) {
    filtered.sort((a, b) => b.da - a.da || b.valueScore - a.valueScore);
    filtered = filtered.slice(0, 120);
  }

  return filtered;
}

export async function getRecommendations(
  profile: ClientProfile,
  message: string,
  pubs: Publication[],
): Promise<{ explanation: string; recommendations: PubRecommendation[]; budgetUsed: number; pubCount: number; avgDA: number }> {
  const filtered = filterPubs(message, pubs);

  if (filtered.length === 0) {
    return { explanation: 'No publications matched. Try a broader search.', recommendations: [], budgetUsed: 0, pubCount: 0, avgDA: 0 };
  }

  const compactData = filtered.map(compactPub).join('\n');

  const system = `You are a PR strategist recommending publications. For EACH publication, explain WHY it fits and WHAT AUDIENCE reads it. Stay within budget. Return ONLY JSON.

Format: {"explanation":"...","recommendations":[{"name":"Pub","reason":"...","audienceInsight":"...","fitScore":9}],"budgetUsed":0,"pubCount":0,"avgDA":0}`;

  const userPrompt = `CLIENT:
Website: ${profile.websiteUrl}
Product: ${profile.productDescription}
Industry: ${profile.industry}
Audience: ${profile.targetAudience}
Goals: ${profile.goals}
Tone: ${profile.tone}

PUBLICATIONS (${filtered.length}):
${compactData}

REQUEST: "${message}"

Pick the best 4-8 publications. Return ONLY JSON.`;

  try {
    const text = await callXAI(system, userPrompt, 0.4, 4096);
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/) || [null, text];
    const result = JSON.parse((match[1] || text).trim());

    const mapped: PubRecommendation[] = [];
    for (const rec of (result.recommendations || [])) {
      const pub = pubs.find((p) => p.name.toLowerCase().includes(rec.name.toLowerCase()));
      if (pub && !mapped.find((m) => m.publication.name === pub.name)) {
        mapped.push({
          publication: pub,
          reason: rec.reason || `Good fit for ${profile.industry}`,
          audienceInsight: rec.audienceInsight || `${pub.displayGenre} audience`,
          fitScore: rec.fitScore || 7,
        });
      }
    }

    return {
      explanation: result.explanation || `I found ${mapped.length} publications for you.`,
      recommendations: mapped,
      budgetUsed: mapped.reduce((s, r) => s + r.publication.price, 0),
      pubCount: mapped.length,
      avgDA: mapped.length ? Math.round(mapped.reduce((s, r) => s + r.publication.da, 0) / mapped.length) : 0,
    };
  } catch {
    const top = filtered.slice(0, 6);
    const recs = top.map((p) => ({
      publication: p,
      reason: `DA ${p.da} ${p.displayGenre} publication`,
      audienceInsight: `${p.displayGenre} audience`,
      fitScore: 7,
    }));
    return {
      explanation: `I selected ${recs.length} publications for your campaign.`,
      recommendations: recs,
      budgetUsed: recs.reduce((s, r) => s + r.publication.price, 0),
      pubCount: recs.length,
      avgDA: Math.round(recs.reduce((s, r) => s + r.publication.da, 0) / recs.length),
    };
  }
}

// ─── Article Crafting Chat ─────────────────────────────────────

export async function articleCraftingChat(
  profile: ClientProfile,
  selectedPubs: Publication[],
  history: { role: string; text: string }[],
  message: string,
): Promise<{ response: string; readyToWrite: boolean; articleBrief?: { angles: string; milestones: string; quotes: string; cta: string; avoid: string } }> {
  const historyText = history.slice(-6).map((h) => `${h.role}: ${h.text}`).join('\n');
  const pubsText = selectedPubs.map((p) => `- ${p.name} (${p.displayGenre}, DA ${p.da})`).join('\n');

  const system = `You're planning PR articles. Ask strategic questions about angles, quotes, CTAs. When ready, set readyToWrite=true. Return ONLY JSON.

Format: {"response":"...","readyToWrite":false,"articleBrief":{"angles":"","milestones":"","quotes":"","cta":"","avoid":""}}`;

  const userPrompt = `COMPANY: ${profile.websiteUrl} | ${profile.productDescription}
PUBLICATIONS:
${pubsText}

CONVERSATION:
${historyText}

CLIENT: "${message}"

Continue. Return ONLY JSON.`;

  try {
    const text = await callXAI(system, userPrompt, 0.6, 2048);
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/) || [null, text];
    const result = JSON.parse((match[1] || text).trim());
    return {
      response: result.response || text,
      readyToWrite: !!result.readyToWrite,
      articleBrief: result.articleBrief,
    };
  } catch {
    return { response: 'Great! Let me write the articles for you now.', readyToWrite: true };
  }
}

// ─── Article Generation (one at a time) ────────────────────────

export async function generateArticle(
  profile: ClientProfile,
  pub: Publication,
  brief?: { angles: string; milestones: string; quotes: string; cta: string; avoid: string },
): Promise<{ pubName: string; genre: string; article: string } | null> {
  const briefText = brief
    ? `BRIEF:
Angles: ${brief.angles}
Milestones: ${brief.milestones}
Quotes: ${brief.quotes}
CTA: ${brief.cta}
Avoid: ${brief.avoid}
`
    : '';

  const system = `You are a professional journalist writing for ${pub.name} (${pub.displayGenre}). Write a 400-600 word publication-ready article. Match the publication's tone. Include a compelling headline.`;

  const userPrompt = `Write an article for ${pub.name} (${pub.displayGenre}, ${pub.displayRegion}, DA ${pub.da}).

COMPANY: ${profile.websiteUrl}
Product: ${profile.productDescription}
Industry: ${profile.industry}
Target Audience: ${profile.targetAudience}
Goals: ${profile.goals}
Tone: ${profile.tone}
${briefText}

Write a complete, ready-to-publish article with headline. Return ONLY JSON: {"headline":"...","article":"full article text"}`;

  try {
    const text = await callXAI(system, userPrompt, 0.8, 4096);
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/) || [null, text];
    const result = JSON.parse((match[1] || text).trim());

    const headline = result.headline || result.title || `Featured in ${pub.name}`;
    const articleBody = result.article || result.content || result.text || '';

    if (!articleBody || articleBody.length < 100) return null;

    return {
      pubName: pub.name,
      genre: pub.displayGenre,
      article: `# ${headline}\n\n${articleBody}`,
    };
  } catch {
    return null;
  }
}

export async function generateArticles(
  profile: ClientProfile,
  selectedPubs: Publication[],
  brief?: { angles: string; milestones: string; quotes: string; cta: string; avoid: string },
): Promise<{ articles: { pubName: string; genre: string; article: string }[] }> {
  const results: { pubName: string; genre: string; article: string }[] = [];

  for (const pub of selectedPubs) {
    const result = await generateArticle(profile, pub, brief);
    if (result) results.push(result);
  }

  return { articles: results };
}
