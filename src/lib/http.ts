// Universal HTTP client with Tauri and browser support
let tauriHttpAvailable = false;
let tauriHttpMod: any = null;

// Try to initialize Tauri HTTP plugin once
const initTauriHttp = async () => {
  if (tauriHttpMod !== null) return; // Already initialized
  
  try {
    tauriHttpMod = await import('@tauri-apps/plugin-http').catch(() => false);
    tauriHttpAvailable = !!(tauriHttpMod && tauriHttpMod.fetch);
  } catch (error) {
    tauriHttpMod = false;
    tauriHttpAvailable = false;
  }
};

export async function httpGet(url: string) {
  // Initialize Tauri HTTP if not done yet
  if (tauriHttpMod === null) {
    await initTauriHttp();
  }
  
  // Try Tauri HTTP first if available
  if (tauriHttpAvailable && tauriHttpMod?.fetch) {
    try {
      const r = await tauriHttpMod.fetch(url, { method: 'GET' });
      return await r.json();
    } catch (error) {
      console.warn('Tauri HTTP request failed, falling back to browser fetch:', error);
    }
  }
  
  // Browser fallback
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