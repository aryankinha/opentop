// src/utils/deviceName.js
// Generates random readable device names.

import { randomInt } from 'node:crypto';
import { hostname } from 'node:os';

const ADJECTIVES = [
  'swift', 'bright', 'calm', 'bold', 'cool', 'dark', 'deep', 'fast',
  'fierce', 'free', 'gentle', 'golden', 'happy', 'kind', 'light', 'lucky',
  'noble', 'pure', 'quiet', 'royal', 'silent', 'silver', 'smart', 'soft',
  'steady', 'strong', 'true', 'wise', 'wild', 'young', 'blue', 'red',
  'green', 'purple', 'orange', 'yellow', 'pink', 'gray', 'white', 'black'
];

const ANIMALS = [
  'falcon', 'eagle', 'hawk', 'owl', 'raven', 'swan', 'wolf', 'fox',
  'bear', 'lion', 'tiger', 'panther', 'leopard', 'cheetah', 'jaguar', 'lynx',
  'otter', 'deer', 'moose', 'elk', 'bison', 'dolphin', 'whale', 'shark',
  'dragon', 'phoenix', 'griffin', 'pegasus', 'unicorn', 'hydra', 'kraken',
  'sparrow', 'robin', 'jay', 'finch', 'wren', 'crow', 'dove', 'heron'
];

/**
 * Generates a random readable device name.
 * Format: {adjective}-{animal}-{4-digit-number}
 * @returns {string} e.g., "blue-tiger-4821"
 */
export function generateDeviceName() {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  const number = randomInt(1000, 10000); // 1000-9999
  
  return `${adjective}-${animal}-${number}`;
}

/**
 * Generates a deterministic device name based on hostname.
 * This ensures the same machine gets the same name (useful for testing).
 * @returns {string}
 */
export function generateDeterministicName() {
  const host = hostname().toLowerCase();
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = ((hash << 5) - hash) + host.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use hash to pick adjective and animal
  const adjIndex = Math.abs(hash) % ADJECTIVES.length;
  const animalIndex = Math.abs(hash >> 8) % ANIMALS.length;
  const number = 1000 + (Math.abs(hash >> 16) % 9000);
  
  return `${ADJECTIVES[adjIndex]}-${ANIMALS[animalIndex]}-${number}`;
}

/**
 * Validates a device name.
 * Must be alphanumeric + hyphens, 3-50 chars.
 * @param {string} name
 * @returns {boolean}
 */
export function isValidDeviceName(name) {
  if (typeof name !== 'string') return false;
  if (name.length < 3 || name.length > 50) return false;
  return /^[a-z0-9-]+$/.test(name);
}

export default {
  generateDeviceName,
  generateDeterministicName,
  isValidDeviceName,
};
