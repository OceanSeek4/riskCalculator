/**
 * Tauri Store utilities for persistent storage
 * 步骤 4.1：通用 Store 工具
 */

import { Store } from '@tauri-apps/plugin-store';

let settingsStore: Store | null = null;

/**
 * 获取设置存储实例
 */
export async function getSettingsStore(): Promise<Store> {
  if (!settingsStore) {
    settingsStore = await Store.load('settings.json');
  }
  return settingsStore;
}

/**
 * 从存储中加载JSON数据
 * @param key 存储键名
 * @returns 解析后的数据或null
 */
export async function loadJSON<T = any>(key: string): Promise<T | null> {
  try {
    const store = await getSettingsStore();
    const value = await store.get(key);
    return value ? JSON.parse(value as string) : null;
  } catch (error) {
    console.warn(`Failed to load JSON from store key "${key}":`, error);
    return null;
  }
}

/**
 * 保存JSON数据到存储
 * @param key 存储键名
 * @param value 要保存的数据
 */
export async function saveJSON(key: string, value: any): Promise<void> {
  try {
    const store = await getSettingsStore();
    await store.set(key, JSON.stringify(value));
    await store.save();
  } catch (error) {
    console.error(`Failed to save JSON to store key "${key}":`, error);
    throw error;
  }
}

/**
 * 删除存储中的键
 * @param key 存储键名
 */
export async function deleteKey(key: string): Promise<void> {
  try {
    const store = await getSettingsStore();
    await store.delete(key);
    await store.save();
  } catch (error) {
    console.warn(`Failed to delete store key "${key}":`, error);
  }
}

/**
 * 清除过期的状态数据（>12小时）
 * @param keyPrefix 键前缀，如 'trailingState:'
 */
export async function cleanupExpiredStates(keyPrefix: string): Promise<void> {
  try {
    const store = await getSettingsStore();
    const keys = await store.keys();
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;

    for (const key of keys) {
      if (key.startsWith(keyPrefix)) {
        const value = await store.get(key);
        if (value) {
          try {
            const data = JSON.parse(value as string);
            if (data.ts && (now - data.ts) > TWELVE_HOURS) {
              await store.delete(key);
              console.log(`Cleaned up expired state: ${key}`);
            }
          } catch (parseError) {
            // 如果解析失败，删除损坏的数据
            await store.delete(key);
            console.warn(`Cleaned up corrupted state: ${key}`);
          }
        }
      }
    }
    await store.save();
  } catch (error) {
    console.warn(`Failed to cleanup expired states for prefix "${keyPrefix}":`, error);
  }
}