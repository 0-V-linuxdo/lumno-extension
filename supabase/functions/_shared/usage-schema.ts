const METRICS = new Set([
  'command_bar_opened',
  'tab_switch_completed',
  'web_search_submitted',
  'site_search_submitted',
  'ai_search_submitted',
  'newtab_opened',
  'document_pip_started',
  'video_pip_started',
  'sync_succeeded',
  'sync_failed',
  'wallpaper_upload_succeeded',
  'wallpaper_upload_failed'
]);

const CONFIG_ENUMS: Record<string, Set<string>> = {
  theme_mode: new Set(['system', 'light', 'dark']),
  language_mode: new Set(['system', 'zh-CN', 'zh-TW', 'ja', 'en']),
  recent_mode: new Set(['most', 'recent']),
  recent_count_bucket: new Set(['0-0', '1-4', '5-8', '9-12', '13-20', '21+', 'unknown']),
  newtab_width_mode: new Set(['wide', 'standard']),
  newtab_search_width_bucket: new Set(['0-720', '721-800', '801-920', '921-1040', '1041+', 'unknown']),
  newtab_theme_mode: new Set(['system', 'light', 'dark']),
  wallpaper_source: new Set(['none', 'builtin', 'custom']),
  overlay_size_mode: new Set(['compact', 'standard', 'large'])
};

const CONFIG_COUNTS = new Set([
  'shortcut_count',
  'pinned_recent_site_count',
  'hidden_recent_site_count',
  'custom_search_provider_count',
  'disabled_search_provider_count',
  'search_blacklist_rule_count',
  'favicon_blacklist_rule_count'
]);

const CONFIG_BOOLEANS = new Set([
  'auto_pip_enabled',
  'tab_switcher_enabled',
  'document_pip_enabled',
  'pinned_tab_recovery_enabled'
]);

type UsageBatch = {
  schema_version: number;
  batch_id: string;
  day: string;
  metrics: Record<string, number>;
  dimensions: Record<string, string>;
  configuration: Record<string, string | number | boolean>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasExactOrSubsetKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function sanitizeMetrics(value: unknown): Record<string, number> | null {
  if (!isRecord(value) || Object.keys(value).length < 1 || Object.keys(value).length > METRICS.size) {
    return null;
  }
  const metrics: Record<string, number> = {};
  for (const [key, rawCount] of Object.entries(value)) {
    if (!METRICS.has(key) || !Number.isSafeInteger(rawCount) || Number(rawCount) < 1 || Number(rawCount) > 100000) {
      return null;
    }
    metrics[key] = Number(rawCount);
  }
  return metrics;
}

function sanitizeDimensions(value: unknown): Record<string, string> | null {
  if (!isRecord(value) || !hasExactOrSubsetKeys(value, new Set([
    'extension_version', 'locale', 'browser_family', 'platform_family'
  ]))) {
    return null;
  }
  const extensionVersion = String(value.extension_version || '');
  const locale = String(value.locale || '');
  const browser = String(value.browser_family || '');
  const platform = String(value.platform_family || '');
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(extensionVersion) ||
      !['zh-CN', 'zh-TW', 'ja', 'en', 'other'].includes(locale) ||
      !['chrome', 'edge', 'brave', 'vivaldi', 'opera', 'other'].includes(browser) ||
      !['windows', 'macos', 'linux', 'chromeos', 'other'].includes(platform)) {
    return null;
  }
  return {
    extension_version: extensionVersion,
    locale,
    browser_family: browser,
    platform_family: platform
  };
}

function sanitizeConfiguration(value: unknown): Record<string, string | number | boolean> | null {
  if (!isRecord(value)) {
    return null;
  }
  const allowed = new Set([
    'schema_version',
    ...Object.keys(CONFIG_ENUMS),
    ...CONFIG_COUNTS,
    ...CONFIG_BOOLEANS
  ]);
  if (!hasExactOrSubsetKeys(value, allowed) || value.schema_version !== 1) {
    return null;
  }
  const result: Record<string, string | number | boolean> = { schema_version: 1 };
  for (const [key, allowedValues] of Object.entries(CONFIG_ENUMS)) {
    const normalized = String(value[key] || '');
    if (!allowedValues.has(normalized)) {
      return null;
    }
    result[key] = normalized;
  }
  for (const key of CONFIG_COUNTS) {
    const count = value[key];
    if (!Number.isSafeInteger(count) || Number(count) < 0 || Number(count) > 500) {
      return null;
    }
    result[key] = Number(count);
  }
  for (const key of CONFIG_BOOLEANS) {
    if (typeof value[key] !== 'boolean') {
      return null;
    }
    result[key] = value[key] as boolean;
  }
  return result;
}

export function sanitizeUsageBatch(value: unknown): UsageBatch | null {
  if (!isRecord(value) || !hasExactOrSubsetKeys(value, new Set([
    'schema_version', 'batch_id', 'day', 'metrics', 'dimensions', 'configuration'
  ])) || value.schema_version !== 1) {
    return null;
  }
  const batchId = String(value.batch_id || '');
  const day = String(value.day || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batchId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return null;
  }
  const metrics = sanitizeMetrics(value.metrics);
  const dimensions = sanitizeDimensions(value.dimensions);
  const configuration = sanitizeConfiguration(value.configuration);
  return metrics && dimensions && configuration
    ? { schema_version: 1, batch_id: batchId, day, metrics, dimensions, configuration }
    : null;
}
