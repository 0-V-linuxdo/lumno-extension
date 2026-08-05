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
  assert.strictEqual(result.triggerable, false);
}

{
  const result = classify('The request failed because the server was unavailable.', {
    uiLanguage: 'en'
  });
  assert.strictEqual(result.features.errorLike, false);
  assert.strictEqual(result.triggerable, false);
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
  assert.strictEqual(result.triggerable, false);
}

[
  'the',
  'and',
  'click here',
  'learn more',
  'next page',
  'Welcome to our website'
].forEach((text) => {
  assert.strictEqual(
    classify(text, { uiLanguage: 'en' }).triggerable,
    false,
    `generic English selection should stay quiet: ${text}`
  );
});

assert.strictEqual(
  classify('click here', { uiLanguage: 'zh-CN' }).triggerable,
  false,
  'foreign-language boilerplate should not become a translation trigger'
);

[
  '点击这里',
  '了解更多',
  '下一步',
  '欢迎访问我们的网站',
  '这里',
  '更多'
].forEach((text) => {
  assert.strictEqual(
    classify(text, { uiLanguage: 'zh-CN' }).triggerable,
    false,
    `generic Chinese selection should stay quiet: ${text}`
  );
});

assert.strictEqual(
  classify('了解更多', { uiLanguage: 'en' }).triggerable,
  false,
  'CJK boilerplate should stay quiet in a foreign UI locale'
);

[
  ['React', { uiLanguage: 'en' }],
  ['React components', { uiLanguage: 'en' }],
  ['AI', { uiLanguage: 'en' }],
  ['量子纠缠', { uiLanguage: 'zh-CN' }],
  ['算法', { uiLanguage: 'zh-CN' }],
  ['提示词', { uiLanguage: 'zh-CN' }]
].forEach(([text, options]) => {
  assert.strictEqual(
    classify(text, options).triggerable,
    true,
    `meaningful term should expose the toolbar: ${text}`
  );
});

{
  const result = classify('OpenAI GPT-5 latest news', { uiLanguage: 'en' });
  assert.strictEqual(result.triggerable, true);
  assert.strictEqual(result.action, 'search');
}

{
  const result = classify('OpenAI GPT-5 latest news', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'search');
}

{
  const result = classify('How much is 100 USD in CNY?', { uiLanguage: 'en' });
  assert.strictEqual(result.action, 'calculate');
}

{
  const result = classify('Why is the sky blue?', { uiLanguage: 'zh-CN' });
  assert.strictEqual(result.action, 'ask');
}

{
  const result = classify(
    'This release introduces a more reliable synchronization model. '.repeat(5),
    { uiLanguage: 'zh-CN' }
  );
  assert.strictEqual(result.action, 'summarize');
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
{
  const result = classify('selected text', { editable: true, uiLanguage: 'en' });
  assert.strictEqual(result.suppressed, false);
  assert.strictEqual(result.triggerable, true);
}

assert.strictEqual(
  classify('secret token', { sensitive: true, uiLanguage: 'en' }).suppressed,
  true
);

assert.match(intent.buildPrompt('translate', 'hello', 'zh-CN'), /简体中文/);
assert.match(intent.buildPrompt('translate', 'hello', 'zh-TW'), /繁體中文/);
assert.strictEqual(intent.buildPrompt('ask', 'Why?', 'en'), 'Why?');

console.log('selection intent tests passed');
