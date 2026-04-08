// Generate cute, memorable display names for users
// Format: {adjective}-{creature}
// Examples: swift-pikachu, brave-charizard, shadow-dragon

const adjectives = [
  'swift', 'clever', 'brave', 'mighty', 'shadow', 'lightning', 
  'mystic', 'golden', 'silver', 'crimson', 'azure', 'emerald',
  'frost', 'storm', 'cosmic', 'stellar', 'lunar', 'solar',
  'wild', 'noble', 'fierce', 'gentle', 'silent', 'roaring',
  'dancing', 'flying', 'leaping', 'sparking', 'glowing', 'shining'
]

const creatures = [
  // Pokemon
  'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'eevee', 'snorlax',
  'mewtwo', 'dragonite', 'gengar', 'lucario', 'garchomp', 'blaziken',
  'umbreon', 'espeon', 'jolteon', 'vaporeon', 'flareon', 'sylveon',
  
  // Animals
  'fox', 'wolf', 'tiger', 'lion', 'bear', 'eagle', 'hawk', 'falcon',
  'dragon', 'phoenix', 'griffin', 'unicorn', 'pegasus', 'serpent',
  'panther', 'leopard', 'cheetah', 'jaguar', 'raven', 'owl',
  'lynx', 'otter', 'panda', 'koala', 'raccoon', 'badger'
]

/**
 * Generates a random display name
 * @returns {string} Format: {adjective}-{creature}
 */
export function generateDisplayName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const creature = creatures[Math.floor(Math.random() * creatures.length)]
  return `${adjective}-${creature}`
}

/**
 * Validates a display name format
 * @param {string} name
 * @returns {boolean}
 */
export function isValidDisplayName(name) {
  if (typeof name !== 'string') return false
  if (name.length < 3 || name.length > 50) return false
  // Allow letters, numbers, hyphens, underscores, spaces
  return /^[a-zA-Z0-9\-_ ]+$/.test(name)
}

/**
 * Sanitizes a display name
 * @param {string} name
 * @returns {string}
 */
export function sanitizeDisplayName(name) {
  if (typeof name !== 'string') return ''
  return name.trim().slice(0, 50)
}
