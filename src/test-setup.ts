import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri HTTP plugin for tests
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn().mockResolvedValue({ 
    ok: true,
    json: () => Promise.resolve({}) 
  }),
}));

// Mock browser fetch for tests
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});