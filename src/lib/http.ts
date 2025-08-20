// Tauri v2 HTTP client
export async function httpGet(url: string) {
  try {
    // @ts-ignore - Tauri plugin may not be available in some environments
    const mod = await import('@tauri-apps/plugin-http').catch(() => null);
    if (mod?.fetch) {
      const r = await mod.fetch(url, { method: 'GET' });
      return await r.json();
    }
  } catch (error) {
    console.warn('Tauri HTTP plugin not available, falling back to browser fetch:', error);
  }
  
  // Browser fallback for development
  try {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
    return await r.json();
  } catch (error) {
    throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}