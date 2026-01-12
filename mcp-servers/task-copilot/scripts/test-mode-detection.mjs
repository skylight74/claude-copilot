/**
 * Quick test for activation mode detection fix
 */

// Simulate the fixed patterns
const MODE_PATTERNS = {
  ultrawork: /\bultrawork\b|\bsimple|\bminor\b|\btypo|\bhotfix|\btweak/i,
  analyze: /\banalyz|\banalys/i,
  quick: /\bquick|\bfast|\brapid/i,
  thorough: /\bthorough|\bcomprehensive|\bdetailed|\bin-depth\b|\bcomplex|\barchitecture|\brefactor|\bredesign|\bsystem\b/i
};

function detectActivationMode(title, description) {
  const combinedText = description ? `${title} ${description}` : title;

  // Track all matches with their positions
  const matches = [];

  for (const [mode, pattern] of Object.entries(MODE_PATTERNS)) {
    const match = pattern.exec(combinedText);
    if (match) {
      matches.push({ mode, position: match.index });
      console.log(`  Found "${mode}" at position ${match.index}: "${match[0]}"`);
    }
  }

  // If no matches, return null
  if (matches.length === 0) {
    return null;
  }

  // Sort by position and return the last match
  matches.sort((a, b) => a.position - b.position);
  console.log(`  Last match (winner): "${matches[matches.length - 1].mode}"`);
  return matches[matches.length - 1].mode;
}

// Test the failing case
console.log('\nTest 3: Multiple keywords - last wins');
console.log('Title: "Code review"');
console.log('Description: "Analyze the authentication flow thoroughly"');
const result = detectActivationMode('Code review', 'Analyze the authentication flow thoroughly');
console.log(`Result: ${result}`);
console.log(`Expected: thorough`);
console.log(`Test ${result === 'thorough' ? 'PASSED ✓' : 'FAILED ✗'}`);

// Additional test cases
console.log('\n\nAdditional Tests:');

console.log('\nTest: "Quick analysis needed"');
const test1 = detectActivationMode('Quick analysis needed', undefined);
console.log(`Result: ${test1} (expected: analyze - last keyword wins)`);

console.log('\nTest: "Analyze quickly"');
const test2 = detectActivationMode('Analyze quickly', undefined);
console.log(`Result: ${test2} (expected: quick - last keyword wins)`);

console.log('\nTest: "Simple task"');
const test3 = detectActivationMode('Simple task', undefined);
console.log(`Result: ${test3} (expected: ultrawork)`);

console.log('\nTest: "Thoroughly analyze"');
const test4 = detectActivationMode('Thoroughly analyze', undefined);
console.log(`Result: ${test4} (expected: analyze - last keyword wins)`);
