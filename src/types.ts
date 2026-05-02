export interface Publication {
  name: string;
  price: number;
  da: number;
  dr: number;
  genre: string;
  displayGenre: string;
  tat: string;
  sponsored: string;
  indexed: string;
  dofollow: string;
  region: string;
  displayRegion: string;
  erotic: boolean;
  health: boolean;
  cbd: boolean;
  crypto: boolean;
  gambling: boolean;
  valueScore: number;
}

export type ConversationPhase =
  | 'discovery'
  | 'recommending'
  | 'selecting'
  | 'crafting'
  | 'reviewing'
  | 'invoicing';

export interface ClientProfile {
  websiteUrl: string;
  productDescription: string;
  industry: string;
  targetAudience: string;
  goals: string;
  uniqueSellingPoints: string;
  keyMessages: string;
  tone: string;
}

export interface PubRecommendation {
  publication: Publication;
  reason: string;
  audienceInsight: string;
  fitScore: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  recommendations?: PubRecommendation[];
  budgetUsed?: number;
  pubCount?: number;
  avgDA?: number;
  isLoading?: boolean;
}

export interface ArticleEntry {
  pubName: string;
  genre: string;
  publication: Publication;
  article: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes: string;
}

export interface InvoiceItem {
  pubName: string;
  price: number;
  da: number;
  genre: string;
  articleStatus: string;
}
