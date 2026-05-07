#!/usr/bin/env node
/**
 * validate-skills.js
 * Validates skill definitions in the marketplace against the expected schema.
 * Checks for required fields, version format, and duplicate skill IDs.
 */

const fs = require('fs');
const path = require('path');

const MARKETPLACE_PATH = path.join(__dirname, '..', '.claude-plugin', 'marketplace.json');

// Required fields for each skill entry
const REQUIRED_SKILL_FIELDS = ['id', 'name', 'description', 'version', 'category'];

// Semantic version regex: major.minor.patch (also allows pre-release like 1.0.0-beta.1)
const VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

// Minimum description length — keeping this at 30 for my personal use,
// the upstream bumped it to 50 but that's too strict for my draft skills
const MIN_DESCRIPTION_LENGTH = 30;

let hasErrors = false;

function logError(message) {
  console.error(`[ERROR] ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.warn(`[WARN]  ${message}`);
}

function logInfo(message) {
  console.log(`[INFO]  ${message}`);
}

function validateSkill(skill, index) {
  const label = skill.id || `skill at index ${index}`;

  // Check required fields
  for (const field of REQUIRED_SKILL_FIELDS) {
    if (!skill[field] || String(skill[field]).trim() === '') {
      logError(`"${label}" is missing required field: "${field}"`);
    }
  }

  // Validate version format
  if (skill.version && !VERSION_REGEX.test(skill.version)) {
    logError(`"${label}" has invalid version format "${skill.version}" — expected semver (e.g. 1.0.0)`);
  }

  // Warn if description is too short
  if (skill.description && skill.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    logWarning(`"${label}" has a very short description (min ${MIN_DESCRIPTION_LENGTH} chars recommended)`);
  }

  // Warn if no tags provided
  if (!skill.tags || !Array.isArray(skill.tags) || skill.tags.length === 0) {
    logWarning(`"${label}" has no tags defined`);
  }
}

function validateMarketplace(data) {
  if (!data || typeof data !== 'object') {
    logError('marketplace.json root must be a JSON object');
    return;
  }

  const skills = data.skills;

  if (!Array.isArray(skills)) {
    logError('marketplace.json must contain a "skills" array');
    return;
  }

  logInfo(`Found ${skills.length} skill(s) to validate`);

  const seenIds = new Set();

  skills.forEach((skill, index) => {
    // Check for duplicate IDs
    if (skill.id) {
      if (seenIds.has(skill.id)) {
        logError(`Duplicate skill ID found: "${skill.id}"`);
      } else {
        seenIds.add(skill.id);
      }
    }

    validateSkill(skill, index);
  });
}

function main() {
  logInfo(`Validating marketplace: ${MARKETPLACE_PATH}`);

  if (!fs.existsSync(MARKETPLACE_PATH)) {
    logError(`marketplace.json not found at path: ${MARKETPLACE_PATH}`);
    process.exit(1);
  }

  let data;
  try {
    const raw = fs.readFileSync(MARKETPLACE_PATH, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    logError(`Failed to parse marketplace.json: ${err.message}`);
  }
}
