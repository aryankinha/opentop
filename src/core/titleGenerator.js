// src/core/titleGenerator.js
// Intelligent conversation title generation using keyword extraction and pattern matching

import logger from '../utils/logger.js';

// Programming languages and frameworks (high priority)
const TECH_KEYWORDS = new Set([
  'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp',
  'ruby', 'go', 'golang', 'rust', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab',
  'react', 'vue', 'angular', 'svelte', 'next', 'nextjs', 'nuxt', 'gatsby',
  'node', 'nodejs', 'express', 'fastify', 'nest', 'nestjs',
  'django', 'flask', 'fastapi', 'spring', 'laravel',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite',
  'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp',
  'git', 'github', 'gitlab', 'vscode', 'vim', 'emacs',
]);

// Action verbs (medium-high priority)
const ACTION_VERBS = new Set([
  'debug', 'fix', 'solve', 'resolve', 'troubleshoot',
  'create', 'build', 'make', 'generate', 'develop',
  'install', 'setup', 'configure', 'deploy', 'initialize',
  'write', 'code', 'implement', 'add', 'update', 'modify',
  'optimize', 'improve', 'refactor', 'clean',
  'explain', 'learn', 'understand', 'teach',
  'test', 'validate', 'check', 'verify',
]);

// Technical terms (medium priority)
const TECH_TERMS = new Set([
  'api', 'rest', 'graphql', 'endpoint', 'route', 'middleware',
  'database', 'db', 'query', 'sql', 'schema', 'migration',
  'server', 'client', 'frontend', 'backend', 'fullstack',
  'component', 'function', 'class', 'method', 'hook',
  'error', 'bug', 'issue', 'problem', 'exception',
  'auth', 'authentication', 'authorization', 'jwt', 'oauth',
  'file', 'folder', 'directory', 'path', 'config',
  'npm', 'yarn', 'pip', 'package', 'dependency',
  'test', 'testing', 'unit', 'integration', 'e2e',
  'css', 'html', 'styling', 'design', 'ui', 'ux',
]);

// Common stop words to ignore
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'can', 'may', 'might',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'me', 'him', 'her', 'us', 'them', 'with', 'from', 'to', 'in', 'on',
  'at', 'by', 'for', 'of', 'about', 'as', 'into', 'through',
  'help', 'please', 'thanks', 'thank', 'hi', 'hello', 'hey',
]);

// Pattern templates for common conversation types
const PATTERNS = [
  // Error/debugging patterns
  {
    regex: /(?:debug|fix|solve|resolve)\s+(?:a\s+)?(?:this\s+)?(\w+(?:\s+\w+)?)\s+(?:error|issue|problem|bug)/i,
    template: (matches) => `Fix ${capitalize(matches[1])} Issue`,
  },
  {
    regex: /(\w+)\s+(?:error|issue|problem|exception)/i,
    template: (matches) => `${capitalize(matches[1])} Error`,
  },
  
  // How-to questions
  {
    regex: /how\s+(?:do\s+i|to|can\s+i)\s+(.+?)(?:\?|$)/i,
    template: (matches) => extractKeyPhrase(matches[1]),
  },
  
  // What is questions
  {
    regex: /what\s+is\s+(.+?)(?:\?|$)/i,
    template: (matches) => `${capitalize(matches[1])} Explained`,
  },
  
  // Create/build patterns
  {
    regex: /(?:create|build|make|write|generate)\s+(?:a\s+)?(\w+(?:\s+\w+){0,3})/i,
    template: (matches) => `Create ${capitalize(matches[1])}`,
  },
  
  // Install/setup patterns
  {
    regex: /(?:install|setup|configure|initialize)\s+(.+?)(?:\s+on|\?|$)/i,
    template: (matches) => `Setup ${capitalize(matches[1])}`,
  },
  
  // Explain patterns
  {
    regex: /(?:explain|describe)\s+(?:how\s+)?(.+?)(?:\s+works?|\?|$)/i,
    template: (matches) => `${capitalize(matches[1])} Guide`,
  },
];

/**
 * Generate a quick title from the first user message
 * Called after the first message exchange (user + assistant)
 */
export function generateQuickTitle(firstUserMessage) {
  if (!firstUserMessage || typeof firstUserMessage !== 'string') {
    return 'New Conversation';
  }

  const text = firstUserMessage.trim();
  
  // Very short messages
  if (text.length < 5) {
    return 'Quick Question';
  }

  // Try pattern matching first (highest confidence)
  for (const pattern of PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const title = pattern.template(match);
      if (title && title.length > 0) {
        return truncate(title, 40);
      }
    }
  }

  // Fallback: extract keywords
  const keywords = extractKeywords(text);
  if (keywords.length > 0) {
    return constructTitle(keywords);
  }

  // Last resort: first few words
  const words = text.split(/\s+/).slice(0, 5).join(' ');
  return truncate(capitalize(words), 40);
}

/**
 * Generate a refined title from the first few messages
 * Called after 2-3 exchanges for better context
 */
export function generateRefinedTitle(messages) {
  if (!messages || messages.length < 2) {
    return null; // Not enough messages
  }

  // Combine first 2-3 user messages and assistant responses for context
  const contextMessages = messages.slice(0, Math.min(6, messages.length));
  const combinedText = contextMessages
    .map(msg => msg.content)
    .join(' ')
    .slice(0, 1000); // Limit text for performance

  // Extract keywords from combined context
  const keywords = extractKeywords(combinedText);
  
  if (keywords.length === 0) {
    return null; // Can't improve, keep quick title
  }

  // Build refined title with more context
  return constructTitle(keywords, true);
}

/**
 * Extract and score keywords from text
 */
export function extractKeywords(text) {
  if (!text) return [];

  // Preprocessing
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();

  // Tokenize
  const words = normalized.split(' ');
  
  // Score words
  const wordScores = new Map();
  
  for (const word of words) {
    if (word.length < 2) continue; // Skip single letters
    if (STOP_WORDS.has(word)) continue; // Skip stop words

    let score = 1; // Base score

    // Boost score based on category
    if (TECH_KEYWORDS.has(word)) score += 3;
    else if (ACTION_VERBS.has(word)) score += 2;
    else if (TECH_TERMS.has(word)) score += 2;
    else if (word.length > 8) score += 1; // Longer words often more meaningful

    const currentScore = wordScores.get(word) || 0;
    wordScores.set(word, currentScore + score);
  }

  // Sort by score and return top keywords
  const sorted = Array.from(wordScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return sorted.slice(0, 5); // Top 5 keywords
}

/**
 * Construct a title from keywords
 */
function constructTitle(keywords, refined = false) {
  if (keywords.length === 0) return 'Conversation';

  // Find action verb and tech keywords
  const action = keywords.find(k => ACTION_VERBS.has(k));
  const tech = keywords.filter(k => TECH_KEYWORDS.has(k) || TECH_TERMS.has(k));

  let parts = [];

  // Pattern: [Action] [Tech/Topic]
  if (action && tech.length > 0) {
    parts.push(capitalize(action));
    parts.push(tech.slice(0, refined ? 2 : 1).map(capitalize).join(' '));
  }
  // Pattern: [Tech] [Tech/Topic]
  else if (tech.length >= 2) {
    parts.push(tech.slice(0, refined ? 3 : 2).map(capitalize).join(' '));
  }
  // Pattern: Top keywords
  else {
    parts.push(keywords.slice(0, refined ? 3 : 2).map(capitalize).join(' '));
  }

  const title = parts.join(' ');
  return truncate(title, 40);
}

/**
 * Extract key phrase from text (remove filler words)
 */
function extractKeyPhrase(text) {
  const words = text.toLowerCase().split(/\s+/);
  const meaningful = words.filter(w => !STOP_WORDS.has(w) && w.length > 2);
  return capitalize(meaningful.slice(0, 3).join(' '));
}

/**
 * Capitalize first letter of each word
 */
function capitalize(text) {
  if (!text) return '';
  return text
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Sanitize title (remove inappropriate content)
 */
export function sanitizeTitle(title) {
  // Basic sanitization - can be expanded with profanity filter
  if (!title || typeof title !== 'string') return 'Conversation';
  
  // Remove excessive punctuation
  const cleaned = title.replace(/[!?]{2,}/g, '!').replace(/\.{2,}/g, '...');
  
  return cleaned.trim() || 'Conversation';
}
