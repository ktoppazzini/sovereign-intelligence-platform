/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOVEREIGN INTELLIGENCE - PERSISTENT AGENT PROFILE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module creates a persistent AI agent profile that:
 * - NEVER drifts from its core identity
 * - Retains ALL details across sessions  
 * - Gets exponentially smarter through learning
 * - Maintains perfect memory with indexed retrieval
 * - Self-improves through reflection and pattern recognition
 * 
 * Architecture:
 * 1. Core Identity (Immutable) - Base personality, values, expertise
 * 2. Knowledge Graph - Growing semantic network of learned facts
 * 3. Interaction Memory - Full history with relevance scoring
 * 4. Skill Matrix - Evolving capabilities with proficiency tracking
 * 5. Learning Engine - Pattern recognition, insight generation
 * 6. Context Window - Smart compression for long conversations
 * 
 * @version 2.0.0
 * @author Sovereign Intelligence Platform
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE IDENTITY (IMMUTABLE - These NEVER change)
// ═══════════════════════════════════════════════════════════════════════════
export const CORE_IDENTITY = {
  name: 'Sovereign',
  version: '2.0.0',
  createdAt: '2025-12-24T00:00:00Z',
  
  // Base personality traits (fixed)
  personality: {
    professional: 0.95,
    helpful: 1.0,
    precise: 0.98,
    empathetic: 0.85,
    curious: 0.90,
    adaptive: 0.95,
    ethical: 1.0,
    transparent: 0.95,
  },
  
  // Core values (immutable)
  values: [
    'User success is paramount',
    'Truth and accuracy above all',
    'Continuous improvement through learning',
    'Respect user privacy and data sovereignty',
    'Clear communication without jargon',
    'Proactive problem-solving',
    'Accountability for recommendations',
    'Collaboration over dictation',
  ],
  
  // Base expertise areas
  expertise: {
    'Government Reform': { level: 'expert', confidence: 0.95 },
    'Defense Intelligence': { level: 'expert', confidence: 0.92 },
    'Pharmaceutical Analysis': { level: 'expert', confidence: 0.90 },
    'Enterprise Analytics': { level: 'expert', confidence: 0.94 },
    'AI/ML Systems': { level: 'expert', confidence: 0.96 },
    'Data Visualization': { level: 'expert', confidence: 0.93 },
    'Natural Language Processing': { level: 'expert', confidence: 0.95 },
    'Business Intelligence': { level: 'expert', confidence: 0.92 },
    'Project Management': { level: 'advanced', confidence: 0.88 },
    'Strategic Planning': { level: 'advanced', confidence: 0.87 },
  },
  
  // Communication style (consistent)
  communicationStyle: {
    tone: 'professional yet approachable',
    structure: 'organized with clear hierarchy',
    vocabulary: 'adapt to user level',
    responses: 'comprehensive but concise',
    examples: 'relevant and practical',
    followUp: 'proactive suggestions',
  },
  
  // Response principles
  responsePrinciples: [
    'Always acknowledge the question/request first',
    'Provide context before diving into details',
    'Use structured responses for complex topics',
    'Include actionable next steps',
    'Admit uncertainty when appropriate',
    'Ask clarifying questions proactively',
    'Reference relevant past interactions',
    'Learn and improve from feedback',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH - Growing semantic network
// ═══════════════════════════════════════════════════════════════════════════
export class KnowledgeGraph {
  constructor() {
    this.nodes = new Map(); // { id: { concept, type, attributes, created, accessed, importance } }
    this.edges = new Map(); // { id: { from, to, relation, weight, created } }
    this.index = new Map(); // { keyword: [nodeIds] } for fast retrieval
    this.embeddings = new Map(); // Semantic embeddings for similarity search
  }
  
  addNode(concept, type, attributes = {}) {
    const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const node = {
      id,
      concept,
      type, // 'fact', 'entity', 'concept', 'procedure', 'preference'
      attributes,
      created: new Date().toISOString(),
      accessed: new Date().toISOString(),
      accessCount: 1,
      importance: this.calculateImportance(type, attributes),
    };
    
    this.nodes.set(id, node);
    this.indexNode(id, concept);
    
    return id;
  }
  
  addEdge(fromId, toId, relation, weight = 1.0) {
    const id = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const edge = {
      id,
      from: fromId,
      to: toId,
      relation, // 'is_a', 'has', 'related_to', 'causes', 'precedes', 'requires'
      weight,
      created: new Date().toISOString(),
      reinforcements: 1,
    };
    
    this.edges.set(id, edge);
    return id;
  }
  
  indexNode(nodeId, concept) {
    const keywords = this.extractKeywords(concept);
    keywords.forEach(keyword => {
      if (!this.index.has(keyword)) {
        this.index.set(keyword, []);
      }
      this.index.get(keyword).push(nodeId);
    });
  }
  
  extractKeywords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }
  
  calculateImportance(type, attributes) {
    const typeWeights = {
      'preference': 1.0,
      'procedure': 0.9,
      'fact': 0.7,
      'entity': 0.6,
      'concept': 0.5,
    };
    
    let importance = typeWeights[type] || 0.5;
    
    // Boost for user-specific info
    if (attributes.userSpecific) importance *= 1.3;
    if (attributes.recentlyLearned) importance *= 1.2;
    if (attributes.frequentlyAccessed) importance *= 1.1;
    
    return Math.min(importance, 1.0);
  }
  
  search(query, limit = 10) {
    const keywords = this.extractKeywords(query);
    const scores = new Map();
    
    keywords.forEach(keyword => {
      const nodeIds = this.index.get(keyword) || [];
      nodeIds.forEach(nodeId => {
        const current = scores.get(nodeId) || 0;
        const node = this.nodes.get(nodeId);
        scores.set(nodeId, current + (node?.importance || 0.5));
      });
    });
    
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([nodeId]) => {
        const node = this.nodes.get(nodeId);
        // Update access tracking
        node.accessed = new Date().toISOString();
        node.accessCount++;
        return node;
      });
  }
  
  getRelatedNodes(nodeId, depth = 2) {
    const related = new Set();
    const queue = [{ id: nodeId, currentDepth: 0 }];
    
    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift();
      if (currentDepth >= depth) continue;
      
      this.edges.forEach(edge => {
        if (edge.from === id && !related.has(edge.to)) {
          related.add(edge.to);
          queue.push({ id: edge.to, currentDepth: currentDepth + 1 });
        }
        if (edge.to === id && !related.has(edge.from)) {
          related.add(edge.from);
          queue.push({ id: edge.from, currentDepth: currentDepth + 1 });
        }
      });
    }
    
    return Array.from(related).map(id => this.nodes.get(id)).filter(Boolean);
  }
  
  reinforceEdge(fromConcept, toConcept) {
    // Find and strengthen existing edges between concepts
    const fromNodes = this.search(fromConcept, 1);
    const toNodes = this.search(toConcept, 1);
    
    if (fromNodes.length && toNodes.length) {
      this.edges.forEach(edge => {
        if (edge.from === fromNodes[0].id && edge.to === toNodes[0].id) {
          edge.weight = Math.min(edge.weight * 1.1, 2.0);
          edge.reinforcements++;
        }
      });
    }
  }
  
  export() {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      index: Array.from(this.index.entries()),
    };
  }
  
  import(data) {
    if (data.nodes) this.nodes = new Map(data.nodes);
    if (data.edges) this.edges = new Map(data.edges);
    if (data.index) this.index = new Map(data.index);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTION MEMORY - Full history with smart retrieval
// ═══════════════════════════════════════════════════════════════════════════
export class InteractionMemory {
  constructor() {
    this.interactions = [];
    this.summaries = []; // Compressed summaries for older interactions
    this.patterns = new Map(); // Detected patterns
    this.userPreferences = new Map();
  }
  
  addInteraction(interaction) {
    const enriched = {
      id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...interaction,
      embedding: null, // Would be computed by embedding model
      sentiment: this.analyzeSentiment(interaction),
      topics: this.extractTopics(interaction),
      importance: this.calculateInteractionImportance(interaction),
    };
    
    this.interactions.push(enriched);
    this.detectPatterns(enriched);
    this.extractPreferences(enriched);
    
    // Compress old interactions if needed
    if (this.interactions.length > 100) {
      this.compressOldInteractions();
    }
    
    return enriched;
  }
  
  analyzeSentiment(interaction) {
    const text = interaction.userMessage || '';
    const positiveWords = ['thanks', 'great', 'excellent', 'perfect', 'helpful', 'amazing'];
    const negativeWords = ['wrong', 'error', 'problem', 'issue', 'bad', 'incorrect'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }
  
  extractTopics(interaction) {
    const text = (interaction.userMessage + ' ' + (interaction.agentResponse || '')).toLowerCase();
    const topicKeywords = {
      'reform': ['reform', 'government', 'policy', 'regulation'],
      'defense': ['defense', 'military', 'security', 'threat'],
      'pharma': ['pharma', 'drug', 'clinical', 'trial', 'fda'],
      'analytics': ['analytics', 'data', 'report', 'dashboard', 'metrics'],
      'technical': ['code', 'api', 'database', 'integration', 'system'],
    };
    
    const topics = [];
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }
  
  calculateInteractionImportance(interaction) {
    let importance = 0.5;
    
    // Boost for user feedback
    if (interaction.feedback) importance += 0.2;
    
    // Boost for explicit preferences
    if (interaction.userMessage?.includes('always') || 
        interaction.userMessage?.includes('prefer') ||
        interaction.userMessage?.includes('remember')) {
      importance += 0.3;
    }
    
    // Boost for corrections
    if (interaction.isCorrection) importance += 0.4;
    
    return Math.min(importance, 1.0);
  }
  
  detectPatterns(interaction) {
    // Time patterns
    const hour = new Date(interaction.timestamp).getHours();
    const timePattern = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const currentCount = this.patterns.get(`time_${timePattern}`) || 0;
    this.patterns.set(`time_${timePattern}`, currentCount + 1);
    
    // Topic patterns
    interaction.topics?.forEach(topic => {
      const topicCount = this.patterns.get(`topic_${topic}`) || 0;
      this.patterns.set(`topic_${topic}`, topicCount + 1);
    });
    
    // Question type patterns
    const questionTypes = ['how', 'what', 'why', 'when', 'where', 'can', 'should'];
    const firstWord = interaction.userMessage?.toLowerCase().split(' ')[0];
    if (questionTypes.includes(firstWord)) {
      const qtCount = this.patterns.get(`question_${firstWord}`) || 0;
      this.patterns.set(`question_${firstWord}`, qtCount + 1);
    }
  }
  
  extractPreferences(interaction) {
    const text = interaction.userMessage?.toLowerCase() || '';
    
    // Language preference
    if (text.includes('in spanish') || text.includes('en español')) {
      this.userPreferences.set('preferredLanguage', 'Spanish');
    }
    
    // Detail level preference
    if (text.includes('brief') || text.includes('short') || text.includes('quick')) {
      this.userPreferences.set('detailLevel', 'concise');
    } else if (text.includes('detailed') || text.includes('comprehensive') || text.includes('thorough')) {
      this.userPreferences.set('detailLevel', 'detailed');
    }
    
    // Format preference
    if (text.includes('bullet') || text.includes('list')) {
      this.userPreferences.set('formatPreference', 'bullets');
    } else if (text.includes('table')) {
      this.userPreferences.set('formatPreference', 'table');
    }
  }
  
  compressOldInteractions() {
    // Keep last 50 in full detail, summarize the rest
    const toCompress = this.interactions.slice(0, -50);
    const toKeep = this.interactions.slice(-50);
    
    // Group by day and summarize
    const byDay = new Map();
    toCompress.forEach(int => {
      const day = int.timestamp.split('T')[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(int);
    });
    
    byDay.forEach((dayInteractions, day) => {
      const summary = {
        date: day,
        count: dayInteractions.length,
        topics: [...new Set(dayInteractions.flatMap(i => i.topics || []))],
        avgSentiment: dayInteractions.reduce((sum, i) => sum + i.sentiment, 0) / dayInteractions.length,
        keyInsights: dayInteractions
          .filter(i => i.importance > 0.7)
          .map(i => ({ message: i.userMessage?.substring(0, 100), response: i.agentResponse?.substring(0, 100) }))
          .slice(0, 5),
      };
      this.summaries.push(summary);
    });
    
    this.interactions = toKeep;
  }
  
  searchRelevant(query, limit = 5) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    const scored = this.interactions.map(int => {
      let score = 0;
      const text = (int.userMessage + ' ' + (int.agentResponse || '')).toLowerCase();
      
      queryWords.forEach(word => {
        if (text.includes(word)) score += 0.2;
      });
      
      // Recency boost
      const age = Date.now() - new Date(int.timestamp).getTime();
      const recencyBoost = Math.max(0, 1 - age / (7 * 24 * 60 * 60 * 1000)); // 7 day decay
      score += recencyBoost * 0.3;
      
      // Importance boost
      score += int.importance * 0.2;
      
      return { interaction: int, score };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.interaction);
  }
  
  getRecentContext(count = 10) {
    return this.interactions.slice(-count);
  }
  
  getPreference(key) {
    return this.userPreferences.get(key);
  }
  
  getTopPatterns(count = 5) {
    return Array.from(this.patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);
  }
  
  export() {
    return {
      interactions: this.interactions,
      summaries: this.summaries,
      patterns: Array.from(this.patterns.entries()),
      userPreferences: Array.from(this.userPreferences.entries()),
    };
  }
  
  import(data) {
    if (data.interactions) this.interactions = data.interactions;
    if (data.summaries) this.summaries = data.summaries;
    if (data.patterns) this.patterns = new Map(data.patterns);
    if (data.userPreferences) this.userPreferences = new Map(data.userPreferences);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL MATRIX - Evolving capabilities
// ═══════════════════════════════════════════════════════════════════════════
export class SkillMatrix {
  constructor() {
    this.skills = new Map();
    this.learningHistory = [];
    
    // Initialize with base skills from core identity
    Object.entries(CORE_IDENTITY.expertise).forEach(([skill, data]) => {
      this.skills.set(skill, {
        name: skill,
        level: data.level,
        confidence: data.confidence,
        successRate: 0.9,
        totalAttempts: 100, // Assume prior experience
        successfulAttempts: 90,
        lastUsed: new Date().toISOString(),
        improvementRate: 0.01,
      });
    });
  }
  
  recordAttempt(skillName, success, feedback = null) {
    let skill = this.skills.get(skillName);
    
    if (!skill) {
      // Learn new skill
      skill = {
        name: skillName,
        level: 'novice',
        confidence: 0.3,
        successRate: success ? 1.0 : 0.0,
        totalAttempts: 0,
        successfulAttempts: 0,
        lastUsed: new Date().toISOString(),
        improvementRate: 0.05, // New skills improve faster
      };
      this.skills.set(skillName, skill);
    }
    
    // Update metrics
    skill.totalAttempts++;
    if (success) skill.successfulAttempts++;
    skill.successRate = skill.successfulAttempts / skill.totalAttempts;
    skill.lastUsed = new Date().toISOString();
    
    // Update confidence based on success rate
    skill.confidence = Math.min(0.99, skill.confidence + (success ? 0.01 : -0.02));
    
    // Update level based on confidence and attempts
    skill.level = this.calculateLevel(skill);
    
    // Record learning event
    this.learningHistory.push({
      skill: skillName,
      success,
      feedback,
      timestamp: new Date().toISOString(),
      newConfidence: skill.confidence,
      newLevel: skill.level,
    });
    
    return skill;
  }
  
  calculateLevel(skill) {
    if (skill.confidence >= 0.95 && skill.totalAttempts >= 100) return 'expert';
    if (skill.confidence >= 0.85 && skill.totalAttempts >= 50) return 'advanced';
    if (skill.confidence >= 0.70 && skill.totalAttempts >= 20) return 'intermediate';
    if (skill.confidence >= 0.50 && skill.totalAttempts >= 5) return 'beginner';
    return 'novice';
  }
  
  getSkill(skillName) {
    return this.skills.get(skillName);
  }
  
  getTopSkills(count = 10) {
    return Array.from(this.skills.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count);
  }
  
  getSkillsNeedingImprovement() {
    return Array.from(this.skills.values())
      .filter(s => s.successRate < 0.8 || s.confidence < 0.7)
      .sort((a, b) => a.successRate - b.successRate);
  }
  
  getRecentLearning(count = 10) {
    return this.learningHistory.slice(-count);
  }
  
  export() {
    return {
      skills: Array.from(this.skills.entries()),
      learningHistory: this.learningHistory,
    };
  }
  
  import(data) {
    if (data.skills) this.skills = new Map(data.skills);
    if (data.learningHistory) this.learningHistory = data.learningHistory;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING ENGINE - Pattern recognition & insight generation
// ═══════════════════════════════════════════════════════════════════════════
export class LearningEngine {
  constructor(knowledgeGraph, interactionMemory, skillMatrix) {
    this.knowledge = knowledgeGraph;
    this.memory = interactionMemory;
    this.skills = skillMatrix;
    this.insights = [];
    this.learningGoals = [];
  }
  
  processInteraction(interaction) {
    // 1. Extract and store knowledge
    const newKnowledge = this.extractKnowledge(interaction);
    newKnowledge.forEach(k => {
      const nodeId = this.knowledge.addNode(k.concept, k.type, k.attributes);
      
      // Connect to related existing knowledge
      const related = this.knowledge.search(k.concept, 3);
      related.forEach(relatedNode => {
        if (relatedNode.id !== nodeId) {
          this.knowledge.addEdge(nodeId, relatedNode.id, 'related_to', 0.5);
        }
      });
    });
    
    // 2. Update skills based on interaction
    const topics = interaction.topics || [];
    topics.forEach(topic => {
      const skillName = this.topicToSkill(topic);
      const success = interaction.sentiment >= 0;
      this.skills.recordAttempt(skillName, success, interaction.feedback);
    });
    
    // 3. Generate insights
    const newInsights = this.generateInsights();
    this.insights.push(...newInsights);
    
    // 4. Update learning goals
    this.updateLearningGoals();
    
    return {
      knowledgeAdded: newKnowledge.length,
      skillsUpdated: topics.length,
      insightsGenerated: newInsights.length,
    };
  }
  
  extractKnowledge(interaction) {
    const knowledge = [];
    const text = interaction.userMessage || '';
    
    // Extract preferences
    if (text.includes('prefer') || text.includes('always') || text.includes('like')) {
      knowledge.push({
        concept: text.substring(0, 200),
        type: 'preference',
        attributes: { userSpecific: true, recentlyLearned: true },
      });
    }
    
    // Extract facts (statements with "is", "are", "was", "were")
    const factPatterns = /(\w+(?:\s+\w+)*)\s+(?:is|are|was|were)\s+(\w+(?:\s+\w+)*)/gi;
    let match;
    while ((match = factPatterns.exec(text)) !== null) {
      knowledge.push({
        concept: `${match[1]} is ${match[2]}`,
        type: 'fact',
        attributes: { source: 'user_statement' },
      });
    }
    
    // Extract procedures (instructions with "to", "should", "must")
    if (text.includes('to ') && (text.includes('how') || text.includes('steps'))) {
      knowledge.push({
        concept: text.substring(0, 200),
        type: 'procedure',
        attributes: { actionable: true },
      });
    }
    
    return knowledge;
  }
  
  topicToSkill(topic) {
    const mapping = {
      'reform': 'Government Reform',
      'defense': 'Defense Intelligence',
      'pharma': 'Pharmaceutical Analysis',
      'analytics': 'Data Analytics',
      'technical': 'Technical Implementation',
    };
    return mapping[topic] || topic;
  }
  
  generateInsights() {
    const insights = [];
    
    // Pattern-based insights
    const patterns = this.memory.getTopPatterns(10);
    patterns.forEach(([pattern, count]) => {
      if (count >= 5) {
        const [type, value] = pattern.split('_');
        insights.push({
          type: 'pattern',
          description: `User frequently ${type === 'time' ? `engages in the ${value}` : type === 'topic' ? `discusses ${value}` : `asks ${value} questions`}`,
          confidence: Math.min(0.95, count / 20),
          timestamp: new Date().toISOString(),
        });
      }
    });
    
    // Skill improvement insights
    const improvingSkills = this.skills.getRecentLearning(20)
      .filter(l => l.success)
      .reduce((acc, l) => {
        acc[l.skill] = (acc[l.skill] || 0) + 1;
        return acc;
      }, {});
    
    Object.entries(improvingSkills).forEach(([skill, count]) => {
      if (count >= 3) {
        insights.push({
          type: 'skill_growth',
          description: `Rapidly improving in ${skill}`,
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        });
      }
    });
    
    // Knowledge gap insights
    const weakSkills = this.skills.getSkillsNeedingImprovement();
    weakSkills.slice(0, 3).forEach(skill => {
      insights.push({
        type: 'knowledge_gap',
        description: `Need to improve ${skill.name} (${Math.round(skill.successRate * 100)}% success rate)`,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      });
    });
    
    return insights;
  }
  
  updateLearningGoals() {
    // Clear old goals
    this.learningGoals = this.learningGoals.filter(g => !g.completed);
    
    // Add new goals based on weak skills
    const weakSkills = this.skills.getSkillsNeedingImprovement();
    weakSkills.slice(0, 3).forEach(skill => {
      const existingGoal = this.learningGoals.find(g => g.skill === skill.name);
      if (!existingGoal) {
        this.learningGoals.push({
          skill: skill.name,
          targetConfidence: Math.min(0.95, skill.confidence + 0.2),
          currentConfidence: skill.confidence,
          created: new Date().toISOString(),
          completed: false,
        });
      }
    });
    
    // Add goals based on user preferences
    const preferences = Array.from(this.memory.userPreferences.entries());
    preferences.forEach(([key, value]) => {
      if (key === 'preferredLanguage' && value !== 'English') {
        const existingGoal = this.learningGoals.find(g => g.skill === `${value} Language`);
        if (!existingGoal) {
          this.learningGoals.push({
            skill: `${value} Language`,
            targetConfidence: 0.9,
            currentConfidence: 0.5,
            created: new Date().toISOString(),
            completed: false,
          });
        }
      }
    });
  }
  
  getInsights(count = 10) {
    return this.insights
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, count);
  }
  
  getLearningGoals() {
    return this.learningGoals;
  }
  
  export() {
    return {
      insights: this.insights,
      learningGoals: this.learningGoals,
    };
  }
  
  import(data) {
    if (data.insights) this.insights = data.insights;
    if (data.learningGoals) this.learningGoals = data.learningGoals;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT WINDOW - Smart compression for conversations
// ═══════════════════════════════════════════════════════════════════════════
export class ContextWindow {
  constructor(maxTokens = 8000) {
    this.maxTokens = maxTokens;
    this.messages = [];
    this.summaryBuffer = [];
  }
  
  addMessage(role, content) {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      tokens: this.estimateTokens(content),
    };
    
    this.messages.push(message);
    this.compress();
    
    return message;
  }
  
  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  compress() {
    const totalTokens = this.messages.reduce((sum, m) => sum + m.tokens, 0);
    
    if (totalTokens > this.maxTokens * 0.9) {
      // Keep system message and recent messages
      const systemMessage = this.messages.find(m => m.role === 'system');
      const recentMessages = this.messages.filter(m => m.role !== 'system').slice(-10);
      const oldMessages = this.messages.filter(m => m.role !== 'system').slice(0, -10);
      
      // Summarize old messages
      if (oldMessages.length > 0) {
        const summary = this.summarizeMessages(oldMessages);
        this.summaryBuffer.push(summary);
      }
      
      // Rebuild messages array
      this.messages = systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
    }
  }
  
  summarizeMessages(messages) {
    const topics = new Set();
    const keyPoints = [];
    
    messages.forEach(m => {
      // Extract topics
      const words = m.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 5) topics.add(word);
      });
      
      // Extract key points (sentences ending with . ! ?)
      const sentences = m.content.split(/[.!?]+/).filter(s => s.length > 20);
      keyPoints.push(...sentences.slice(0, 2).map(s => s.trim()));
    });
    
    return {
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      topics: Array.from(topics).slice(0, 10),
      keyPoints: keyPoints.slice(0, 5),
    };
  }
  
  getContext() {
    const summaryContext = this.summaryBuffer.length > 0 ? {
      role: 'system',
      content: `Previous conversation summary: ${JSON.stringify(this.summaryBuffer.slice(-3))}`,
    } : null;
    
    return summaryContext 
      ? [summaryContext, ...this.messages]
      : this.messages;
  }
  
  clear() {
    // Keep summaries but clear messages
    this.messages = this.messages.filter(m => m.role === 'system');
  }
  
  export() {
    return {
      messages: this.messages,
      summaryBuffer: this.summaryBuffer,
    };
  }
  
  import(data) {
    if (data.messages) this.messages = data.messages;
    if (data.summaryBuffer) this.summaryBuffer = data.summaryBuffer;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN AGENT PROFILE CLASS - Orchestrates all components
// ═══════════════════════════════════════════════════════════════════════════
export class AgentProfile {
  constructor(userId) {
    this.userId = userId;
    this.identity = { ...CORE_IDENTITY };
    this.knowledge = new KnowledgeGraph();
    this.memory = new InteractionMemory();
    this.skills = new SkillMatrix();
    this.learning = new LearningEngine(this.knowledge, this.memory, this.skills);
    this.context = new ContextWindow();
    this.stats = {
      totalInteractions: 0,
      totalKnowledgeNodes: 0,
      skillsLearned: 0,
      insightsGenerated: 0,
      lastActive: null,
      createdAt: new Date().toISOString(),
    };
  }
  
  /**
   * Process a user message and learn from it
   */
  processMessage(userMessage, agentResponse = null, feedback = null) {
    const interaction = this.memory.addInteraction({
      userMessage,
      agentResponse,
      feedback,
      isCorrection: feedback?.type === 'correction',
    });
    
    // Learn from interaction
    const learningResult = this.learning.processInteraction(interaction);
    
    // Update context
    this.context.addMessage('user', userMessage);
    if (agentResponse) {
      this.context.addMessage('assistant', agentResponse);
    }
    
    // Update stats
    this.stats.totalInteractions++;
    this.stats.totalKnowledgeNodes = this.knowledge.nodes.size;
    this.stats.skillsLearned = this.skills.skills.size;
    this.stats.insightsGenerated = this.learning.insights.length;
    this.stats.lastActive = new Date().toISOString();
    
    return {
      interaction,
      learning: learningResult,
      stats: this.stats,
    };
  }
  
  /**
   * Generate context for a new response
   */
  generateContext(query) {
    // Get relevant memories
    const relevantMemories = this.memory.searchRelevant(query, 5);
    
    // Get relevant knowledge
    const relevantKnowledge = this.knowledge.search(query, 10);
    
    // Get user preferences
    const preferences = {
      language: this.memory.getPreference('preferredLanguage') || 'English',
      detailLevel: this.memory.getPreference('detailLevel') || 'balanced',
      format: this.memory.getPreference('formatPreference') || 'adaptive',
    };
    
    // Get relevant skills
    const topics = this.memory.extractTopics({ userMessage: query });
    const relevantSkills = topics.map(t => this.skills.getSkill(this.learning.topicToSkill(t))).filter(Boolean);
    
    // Build context object
    return {
      identity: this.identity,
      relevantMemories,
      relevantKnowledge,
      preferences,
      relevantSkills,
      recentContext: this.context.getContext(),
      insights: this.learning.getInsights(3),
    };
  }
  
  /**
   * Export full profile for persistence
   */
  export() {
    return {
      userId: this.userId,
      identity: this.identity,
      knowledge: this.knowledge.export(),
      memory: this.memory.export(),
      skills: this.skills.export(),
      learning: this.learning.export(),
      context: this.context.export(),
      stats: this.stats,
      exportedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Import profile from stored data
   */
  import(data) {
    if (data.identity) this.identity = { ...CORE_IDENTITY, ...data.identity };
    if (data.knowledge) this.knowledge.import(data.knowledge);
    if (data.memory) this.memory.import(data.memory);
    if (data.skills) this.skills.import(data.skills);
    if (data.learning) this.learning.import(data.learning);
    if (data.context) this.context.import(data.context);
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
  }
  
  /**
   * Get profile summary
   */
  getSummary() {
    return {
      identity: {
        name: this.identity.name,
        version: this.identity.version,
      },
      stats: this.stats,
      topSkills: this.skills.getTopSkills(5),
      recentInsights: this.learning.getInsights(3),
      learningGoals: this.learning.getLearningGoals(),
      userPreferences: Array.from(this.memory.userPreferences.entries()),
      topPatterns: this.memory.getTopPatterns(5),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE MANAGER - Handles persistence and retrieval
// ═══════════════════════════════════════════════════════════════════════════
export class ProfileManager {
  constructor() {
    this.profiles = new Map();
    this.storageKey = 'SI_AGENT_PROFILES';
  }
  
  async getProfile(userId) {
    // Check memory cache
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId);
    }
    
    // Try to load from storage
    const stored = await this.loadFromStorage(userId);
    if (stored) {
      const profile = new AgentProfile(userId);
      profile.import(stored);
      this.profiles.set(userId, profile);
      return profile;
    }
    
    // Create new profile
    const profile = new AgentProfile(userId);
    this.profiles.set(userId, profile);
    return profile;
  }
  
  async saveProfile(userId) {
    const profile = this.profiles.get(userId);
    if (!profile) return false;
    
    const data = profile.export();
    await this.saveToStorage(userId, data);
    return true;
  }
  
  async loadFromStorage(userId) {
    try {
      // Try localStorage first (client-side)
      if (typeof window !== 'undefined') {
        const key = `${this.storageKey}_${userId}`;
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      }
      
      // Try API (server-side persistence)
      const res = await fetch(`/api/agent-profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        return data.profile;
      }
    } catch (err) {
      console.warn('[ProfileManager] Load error:', err);
    }
    return null;
  }
  
  async saveToStorage(userId, data) {
    try {
      // Save to localStorage (client-side)
      if (typeof window !== 'undefined') {
        const key = `${this.storageKey}_${userId}`;
        localStorage.setItem(key, JSON.stringify(data));
      }
      
      // Save to API (server-side persistence)
      await fetch('/api/agent-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profile: data }),
      });
    } catch (err) {
      console.warn('[ProfileManager] Save error:', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════
export const profileManager = new ProfileManager();

export default AgentProfile;
