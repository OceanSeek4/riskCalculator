// Universal HTTP client with Tauri and browser support
let tauriHttpAvailable = false;
let tauriHttpMod: any = null;

// Network failure tracking for automatic offline detection
let networkFailureCallback: (() => void) | null = null;
let networkSuccessCallback: (() => void) | null = null;

export function setNetworkCallbacks(
  onFailure: () => void,
  onSuccess: () => void
) {
  networkFailureCallback = onFailure;
  networkSuccessCallback = onSuccess;
}

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
  
  let lastError: Error | null = null;
  
  // Try Tauri HTTP first if available
  if (tauriHttpAvailable && tauriHttpMod?.fetch) {
    try {
      const r = await tauriHttpMod.fetch(url, { method: 'GET' });
      const data = await r.json();
      
      // Success - notify callback
      if (networkSuccessCallback) {
        networkSuccessCallback();
      }
      
      return data;
    } catch (error) {
      console.warn('Tauri HTTP request failed, falling back to browser fetch:', error);
      lastError = error instanceof Error ? error : new Error('Tauri HTTP failed');
    }
  }
  
  // Browser fallback
  try {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
    
    const data = await r.json();
    
    // Success - notify callback  
    if (networkSuccessCallback) {
      networkSuccessCallback();
    }
    
    return data;
  } catch (error) {
    const finalError = error instanceof Error ? error : new Error('Browser fetch failed');
    
    // Network failure - notify callback
    if (networkFailureCallback) {
      networkFailureCallback();
    }
    
    // Throw the most relevant error
    throw new Error(`HTTP request failed: ${finalError.message}${lastError ? ` (Tauri: ${lastError.message})` : ''}`);
  }
}