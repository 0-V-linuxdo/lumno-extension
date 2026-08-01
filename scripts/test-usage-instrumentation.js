const assert = require('assert');
const fs = require('fs');

const background = fs.readFileSync('src/background/background.js', 'utf8');
const newtab = fs.readFileSync('src/newtab/newtab.js', 'utf8');

function run() {
  [
    'command_bar_opened',
    'tab_switch_completed',
    'web_search_submitted',
    'site_search_submitted',
    'ai_search_submitted'
  ].forEach((metric) => {
    assert(background.includes(`recordCloudUsageMetric('${metric}')`), `${metric} should be instrumented`);
  });
  assert(newtab.includes("metric: 'newtab_opened'"), 'new tab opens should use the allowlisted counter');
  assert.doesNotMatch(background, /recordCloudUsageMetric\([^'\n]*(?:query|url|title)/i,
    'telemetry calls must never receive browsing values');
  assert.doesNotMatch(newtab, /cloudRecordUsage[^\n]*(?:url|query|title)/i,
    'new tab telemetry must contain only the metric name');

  console.log('usage instrumentation tests passed');
}

run();
