/**
 * Module-level store for the current AI provider.
 * Avoids re-creating the editor when switching models.
 */
let _provider: 'local' | 'deepseek' = 'local';

export function getProvider(): 'local' | 'deepseek' {
  return _provider;
}

export function setProvider(p: 'local' | 'deepseek') {
  _provider = p;
}
