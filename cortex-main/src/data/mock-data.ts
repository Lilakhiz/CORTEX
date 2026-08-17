export interface KeyInsight {
  text: string;
  importance: 'high' | 'medium' | 'low';
}

export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  sourceLogo: string;
  pubDate: string;
  url: string;
}

export interface CommunityDiscussion {
  id: string;
  subreddit: string;
  title: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  popularity: number;
  summary: string;
  topComment: string;
  url: string;
}

export interface ResearchStage {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
  active: boolean;
  details?: string;
}

export interface NodeRelationship {
  nodeId: string;
  nodeLabel: string;
  type: string;
  strength: number;
  confidence: number;
}

export interface CortexNode {
  id: string;
  type: 'company' | 'person' | 'technology' | 'event' | 'country' | 'research' | 'news';
  label: string;
  summary: string;
  icon: string;
  sources: Source[];
  timeline: TimelineEvent[];
  relatedNodes: string[];
  confidenceScore: number;
  keyInsights: KeyInsight[];
  latestNews: NewsArticle[];
  communityDiscussions: CommunityDiscussion[];
  relationships: NodeRelationship[];
  relatedTopics: string[];
  lastUpdated: string;
  readingTime: number;
  tags: string[];
}

export interface Source {
  id: string;
  title: string;
  description: string;
  url: string;
  favicon: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipName: string;
  type: 'partner' | 'competitor' | 'investor' | 'founder' | 'technology' | 'industry' | 'supplier' | 'acquired' | 'collaboration';
  confidence: number;
  strength: number;
  whyConnected: string;
  supportingSources: Source[];
  relatedEvents: string[];
  relatedQuestions: string[];
}

export interface KnowledgeTrail {
  id: string;
  label: string;
  icon: string;
  direction: 'up' | 'down';
}

export interface SearchStage {
  id: string;
  label: string;
  icon: "Brain" | "Search" | "GitBranch" | "Share2" | "Eye" | "Loader2" | "CheckCircle";
  duration: number;
}

export interface GraphMode {
  id: string;
  label: string;
  icon: string;
}

export const dashboardSearchSuggestions = [
  'OpenAI',
  'Tesla',
  'Quantum Computing',
  'AGI',
  'NVIDIA',
  'Climate Tech',
  'CRISPR',
  'Neural Networks',
];

export const cortexNodes: CortexNode[] = [];
export const relationships: Relationship[] = [];
export const searchStages: SearchStage[] = [
  { id: '1', label: 'Searching', icon: 'Search', duration: 1000 },
  { id: '2', label: 'Processing', icon: 'Brain', duration: 1500 },
  { id: '3', label: 'Finding connections', icon: 'GitBranch', duration: 2000 },
  { id: '4', label: 'Gathering sources', icon: 'Share2', duration: 1500 },
  { id: '5', label: 'Preparing results', icon: 'Eye', duration: 1000 }
];
export const graphModes: GraphMode[] = [];
export const researchStages: ResearchStage[] = [];
export const suggestedQuestions: Record<string, string[]> = {};

// Mock data for the knowledge graph
const mockNodes = [
  { id: 'tesla', name: 'Tesla', type: 'company' },
  { id: 'elon-musk', name: 'Elon Musk', type: 'person' },
  { id: 'nvidia', name: 'NVIDIA', type: 'company' },
  { id: 'openai', name: 'OpenAI', type: 'company' },
  { id: 'ai', name: 'Artificial Intelligence', type: 'technology' },
  { id: 'batteries', name: 'Battery Technology', type: 'technology' },
];

const mockEdges = [
  { source: 'tesla', target: 'elon-musk', relation: 'founded-by' },
  { source: 'tesla', target: 'ai', relation: 'uses' },
  { source: 'elon-musk', target: 'ai', relation: 'interested-in' },
  { source: 'openai', target: 'elon-musk', relation: 'competitor' },
  { source: 'nvidia', target: 'ai', relation: 'powers' },
  { source: 'tesla', target: 'batteries', relation: 'uses' },
  { source: 'batteries', target: 'nvidia', relation: 'partners' },
];

export function generateMockBackendGraph() {
  return {
    nodes: mockNodes,
    edges: mockEdges
  };
}

// Add the missing features export
export interface Feature {
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    title: 'Interactive Knowledge Graphs',
    description: 'Visualize complex information as interconnected nodes and relationships that you can explore and manipulate.'
  },
  {
    title: 'AI-Powered Search',
    description: 'Get contextual understanding instead of just links - our AI synthesizes information from multiple sources.'
  },
  {
    title: 'Real-time Collaboration',
    description: 'Work together with colleagues to build shared knowledge graphs and insights.'
  },
  {
    title: 'Source Verification',
    description: 'Every piece of information is traceable back to its original source with confidence scoring.'
  },
  {
    title: 'Cross-domain Insights',
    description: 'Discover unexpected connections between different fields and areas of study.'
  },
  {
    title: 'Privacy First',
    description: 'Your data stays yours - we never sell or monetize your search history or personal information.'
  }
];

// Add missing mockChatResponses for ChatPanel component
export const mockChatResponses: Record<string, string[]> = {
  tesla: [
    "Tesla was founded in 2003 by Martin Eberhard and Marc Tarpenning, with Elon Musk joining shortly after as a major investor.",
    "Tesla's mission is to accelerate the world's transition to sustainable energy through electric vehicles and renewable energy solutions.",
    "The company is known for its innovative approach to battery technology, autonomous driving, and over-the-air software updates."
  ],
  'elon-musk': [
    "Elon Musk is a South African-born entrepreneur known for founding or leading companies like Tesla, SpaceX, Neuralink, and The Boring Company.",
    "He became Tesla's largest investor in 2004 and took over as CEO in 2008, guiding the company through near-bankruptcy to profitability.",
    "Musk is also known for his ambitious goals like colonizing Mars through SpaceX and developing neural interface technology through Neuralink."
  ],
  nvidia: [
    "NVIDIA was founded in 1993 and is renowned for its graphics processing units (GPUs) used in gaming, professional visualization, and AI.",
    "The company's GPUs have become essential for AI and machine learning workloads, powering everything from research to production systems.",
    "NVIDIA's CUDA platform allows developers to leverage GPU power for general-purpose computing, revolutionizing parallel processing."
  ],
  openai: [
    "OpenAI was founded in 2015 with the mission to ensure that artificial general intelligence benefits all of humanity.",
    "The organization is known for developing advanced AI models like GPT-3, GPT-4, and DALL-E, pushing the boundaries of what's possible with AI.",
    "OpenAI has transitioned from a non-profit to a 'capped-profit' model to attract investment while maintaining its safety-focused mission."
  ],
  ai: [
    "Artificial Intelligence encompasses machines that can perform tasks typically requiring human intelligence, such as learning, reasoning, and perception.",
    "Modern AI is largely driven by machine learning, particularly deep learning neural networks that can identify patterns in vast amounts of data.",
    "AI applications range from narrow AI (like image recognition) to the hypothetical artificial general intelligence (AGI) that could match human cognition."
  ],
  batteries: [
    "Battery technology is crucial for storing energy from renewable sources and powering electric vehicles, making it key to sustainable energy transitions.",
    "Lithium-ion batteries currently dominate the market due to their high energy density, though research continues into alternatives like solid-state batteries.",
    "Improvements in battery technology focus on increasing energy density, reducing charging time, enhancing lifespan, and lowering costs."
  ]
};

export const defaultChatResponses: string[] = [
  "This entity has interesting connections to various technological and business domains.",
  "Understanding its relationships can provide insights into industry trends and innovation patterns.",
  "Explore the knowledge graph to discover how this topic connects to other important concepts and organizations."
];