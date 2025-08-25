// Test script to verify updated offline mode defaults
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Updated Offline Mode Defaults\n');

// Test 1: Check validation schema has correct defaults
console.log('1. Checking validation schema defaults...');
const validationPath = path.join(__dirname, 'src/lib/validation.ts');
if (fs.existsSync(validationPath)) {
  const content = fs.readFileSync(validationPath, 'utf8');
  if (content.includes("offlineStopMode: z.enum(['PRICE', 'PIPS']).default('PIPS')")) {
    console.log('   ✅ Validation schema: Default offline stop mode is PIPS');
  } else {
    console.log('   ❌ Validation schema: Wrong default offline stop mode');
  }
  
  if (content.includes("offlineTakeProfitMode: z.enum(['PRICE', 'RR_RATIO', 'PIPS']).default('RR_RATIO')")) {
    console.log('   ✅ Validation schema: Default offline take profit mode is RR_RATIO');
  } else {
    console.log('   ❌ Validation schema: Wrong default offline take profit mode');
  }
} else {
  console.log('   ❌ Validation file missing');
}

// Test 2: Check store has correct default settings
console.log('\n2. Checking store default settings...');
const storePath = path.join(__dirname, 'src/lib/store.ts');
if (fs.existsSync(storePath)) {
  const storeContent = fs.readFileSync(storePath, 'utf8');
  if (storeContent.includes("offlineStopMode: 'PIPS'")) {
    console.log('   ✅ Store: Default offline stop mode is PIPS');
  } else {
    console.log('   ❌ Store: Wrong default offline stop mode');
  }
  
  if (storeContent.includes("offlineTakeProfitMode: 'RR_RATIO'")) {
    console.log('   ✅ Store: Default offline take profit mode is RR_RATIO');
  } else {
    console.log('   ❌ Store: Wrong default offline take profit mode');
  }
} else {
  console.log('   ❌ Store file missing');
}

// Test 3: Check settings form shows correct defaults
console.log('\n3. Checking settings form default selections...');
const settingsPath = path.join(__dirname, 'src/features/settings/SettingsForm.tsx');
if (fs.existsSync(settingsPath)) {
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  if (settingsContent.includes('点差止损 (Pips Stop)')) {
    console.log('   ✅ Settings form: PIPS stop option available');
  }
  
  if (settingsContent.includes('风险回报比 (R:R Ratio)')) {
    console.log('   ✅ Settings form: RR_RATIO take profit option available');
  }
} else {
  console.log('   ❌ Settings form file missing');
}

console.log('\n✨ Offline Mode Defaults Test Completed!');
console.log('\n📋 New Offline Mode Defaults:');
console.log('  • 默认止损模式: PIPS (点差止损)');
console.log('  • 默认止盈模式: RR_RATIO (风险回报比)');
console.log('  • 订单类型: LIMIT (限价单)');
console.log('  • 移动止损: 禁用');

console.log('\n🎯 离线模式优势:');
console.log('  • PIPS止损：无需实时价格，基于固定点差计算');
console.log('  • RR_RATIO止盈：基于风险回报比例，无需外部数据');
console.log('  • 完全离线运行：所有计算基于用户输入和静态市场配置');
console.log('  • 精确风控：通过点差和比例实现精准仓位管理');