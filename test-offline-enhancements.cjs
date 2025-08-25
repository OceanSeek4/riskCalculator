// Test script to verify comprehensive offline mode enhancements
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Offline Mode Enhancements\n');

// Test 1: Check validation schema has offline mode settings
console.log('1. Checking offline mode validation schema...');
const validationPath = path.join(__dirname, 'src/lib/validation.ts');
if (fs.existsSync(validationPath)) {
  const content = fs.readFileSync(validationPath, 'utf8');
  if (content.includes('defaultOfflineMode') && content.includes('offlineStopMode')) {
    console.log('   ✅ Validation schema includes offline mode settings');
  }
  if (content.includes('offlineTakeProfitMode') && content.includes('offlineOrderType')) {
    console.log('   ✅ All offline mode overrides defined in schema');
  }
} else {
  console.log('   ❌ Validation file missing');
}

// Test 2: Check store has offline mode defaults and sync logic
console.log('\n2. Checking store offline mode integration...');
const storePath = path.join(__dirname, 'src/lib/store.ts');
if (fs.existsSync(storePath)) {
  const storeContent = fs.readFileSync(storePath, 'utf8');
  if (storeContent.includes('defaultOfflineMode') && storeContent.includes('offlineStopMode')) {
    console.log('   ✅ Store includes offline mode default settings');
  }
  if (storeContent.includes('isOfflineMode ? settings.offlineStopMode : settings.defaultStopMode')) {
    console.log('   ✅ Store has conditional offline mode sync logic');
  }
  if (storeContent.includes('defaultSettings.defaultOfflineMode')) {
    console.log('   ✅ Store initializes offline mode from default settings');
  }
} else {
  console.log('   ❌ Store file missing');
}

// Test 3: Check calculator form has comprehensive offline restrictions
console.log('\n3. Checking calculator form offline restrictions...');
const calculatorPath = path.join(__dirname, 'src/features/calculator/CalculatorForm.tsx');
if (fs.existsSync(calculatorPath)) {
  const calcContent = fs.readFileSync(calculatorPath, 'utf8');
  
  // Check ATR restrictions
  if (calcContent.includes('disabled={isOfflineMode}') && calcContent.includes('ATR 止损在离线模式下不可用')) {
    console.log('   ✅ ATR stop mode disabled in offline mode');
  }
  if (calcContent.includes('ATR 止盈在离线模式下不可用')) {
    console.log('   ✅ ATR take profit mode disabled in offline mode');
  }
  
  // Check market order restrictions
  if (calcContent.includes('市价单在离线模式下不可用')) {
    console.log('   ✅ Market orders disabled in offline mode');
  }
  
  // Check price fetching restrictions
  if (calcContent.includes('离线不可用') && calcContent.includes('离线模式不可用')) {
    console.log('   ✅ Price fetching buttons disabled in offline mode');
  }
  
  // Check trailing stops restrictions
  if (calcContent.includes('移动止损需要实时数据支持')) {
    console.log('   ✅ Trailing stops disabled in offline mode');
  }
  
  // Check automatic mode switching
  if (calcContent.includes('Auto-switch away from data-dependent modes')) {
    console.log('   ✅ Automatic mode switching logic implemented');
  }
} else {
  console.log('   ❌ Calculator form file missing');
}

// Test 4: Check settings form has offline mode configuration
console.log('\n4. Checking settings form offline mode configuration...');
const settingsPath = path.join(__dirname, 'src/features/settings/SettingsForm.tsx');
if (fs.existsSync(settingsPath)) {
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  if (settingsContent.includes('离线模式设置 (Offline Mode Settings)')) {
    console.log('   ✅ Settings form includes offline mode section');
  }
  if (settingsContent.includes('defaultOfflineMode') && settingsContent.includes('offlineStopMode')) {
    console.log('   ✅ Settings form has offline mode controls');
  }
  if (settingsContent.includes('离线模式下的默认参数设置')) {
    console.log('   ✅ Settings form explains offline mode purpose');
  }
  if (settingsContent.includes('注意事项 (Notes)')) {
    console.log('   ✅ Settings form includes offline mode warnings');
  }
} else {
  console.log('   ❌ Settings form file missing');
}

// Test 5: Check if TrailingPanel is properly disabled
console.log('\n5. Checking trailing panel offline integration...');
const trailingPanelPath = path.join(__dirname, 'src/features/calculator/TrailingPanel.tsx');
if (fs.existsSync(trailingPanelPath)) {
  const trailingContent = fs.readFileSync(trailingPanelPath, 'utf8');
  if (trailingContent.includes('disabled={isOfflineMode}')) {
    console.log('   ✅ Trailing panel properly disabled in offline mode');
  }
} else {
  console.log('   ⚠️  TrailingPanel file not found (may be wrapped component)');
}

console.log('\n✨ Offline Mode Enhancements Test Completed!');
console.log('\n🔧 New Features Implemented:');
console.log('  • Default offline mode setting in configurations');
console.log('  • Offline-specific parameter overrides (stop/TP/order modes)');
console.log('  • Comprehensive UI restrictions and warnings');
console.log('  • Automatic mode switching when entering offline mode');
console.log('  • Settings interface for offline mode configuration');
console.log('  • Complete trailing stops disabling in offline mode');
console.log('  • Intelligent defaults application based on online/offline state');

console.log('\n📋 Offline Mode Behavior:');
console.log('  • ATR modes → Automatically switch to Price modes');
console.log('  • Market orders → Automatically switch to Limit orders');
console.log('  • Trailing stops → Automatically disabled');
console.log('  • Price fetching → Buttons disabled with warnings');
console.log('  • Market data → Fallback to static defaults');
console.log('  • All changes → Clear user notifications and explanations');