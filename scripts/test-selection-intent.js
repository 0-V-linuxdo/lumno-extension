const assert = require('assert');
const intent = require('../src/shared/selection-intent.js');

function classify(text, options) {
  return intent.classifySelection(text, options || { uiLanguage: 'zh-CN' });
}

{
  const result = classify('serendipity', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'translate');
  assert.strictEqual(result.confidence, 'high');
  assert.strictEqual(result.features.languageMismatch, true);
}

{
  const result = classify('React', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'explain');
  assert.strictEqual(result.confidence, 'medium');
  assert.strictEqual(result.features.languageMismatch, false);
  assert.strictEqual(result.triggerable, true);
}

{
  const result = classify('React components', { uiLanguage: 'en' });
  assert.strictEqual(result.triggerable, true);
}

{
  const result = classify('100', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.features.numericLike, false);
  assert.strictEqual(result.triggerable, false);
}

{
  const result = classify('这是你需要的资料', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.confidence, 'low');
  assert.strictEqual(result.triggerable, true);
}

{
  const result = classify('The request failed because the server was unavailable.', {
    uiLanguage: 'en'
  });
  assert.strictEqual(result.features.errorLike, false);
  assert.strictEqual(result.triggerable, true);
}

{
  const result = classify('TypeError: Cannot read properties of undefined', {
    insideCode: true,
    uiLanguage: 'zh-CN'
  });
  assert.strictEqual(result.action, 'explain');
  assert.strictEqual(result.confidence, 'high');
  assert.strictEqual(result.features.errorLike, true);
}

{
  const result = classify('为什么这个请求会失败？', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'ask');
  assert.strictEqual(result.confidence, 'high');
}

{
  const result = classify('这是你需要的资料', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.confidence, 'low');
}

{
  const result = classify('100 USD to CNY', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'calculate');
  assert.strictEqual(result.confidence, 'high');
}

{
  const result = classify('这是一段需要总结的内容。'.repeat(20), { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'summarize');
  assert.strictEqual(result.confidence, 'high');
}

assert.strictEqual(classify('https://example.com/').suppressed, true);
assert.strictEqual(classify('person@example.com').suppressed, true);
assert.strictEqual(classify('selected text', { editable: true, uiLanguage: 'en' }).suppressed, true);

assert.match(intent.buildPrompt('translate', 'hello', 'zh-CN'), /简体中文/);
assert.match(intent.buildPrompt('translate', 'hello', 'zh-TW'), /繁體中文/);
assert.strictEqual(intent.buildPrompt('ask', 'Why?', 'en'), 'Why?');

console.log('selection intent tests passed');
