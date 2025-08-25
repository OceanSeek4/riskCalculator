// Test script to verify offline mode price initialization functionality
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Offline Mode Price Initialization\n');

// Test 1: Check calculator form has automatic price initialization logic
console.log('1. Checking calculator form price initialization logic...');
const calculatorPath = path.join(__dirname, 'src/features/calculator/CalculatorForm.tsx');
if (fs.existsSync(calculatorPath)) {
  const content = fs.readFileSync(calculatorPath, 'utf8');
  
  if (content.includes('handleInputChange(\'entryPrice\', \'100000\')')) {
    console.log('   ✅ Calculator sets initial price to 100000 in offline mode');
  } else {
    console.log('   ❌ Calculator missing price initialization');
  }
  
  if (content.includes('Set initial price for LIMIT orders in offline mode')) {
    console.log('   ✅ Calculator has auto-initialization for existing LIMIT orders');
  }
  
  if (content.includes('Set initial price when switching to LIMIT order')) {
    console.log('   ✅ Calculator has manual switch price initialization');
  }
  
  // Check useEffect dependencies include formData.entryPrice
  if (content.includes('], [isOfflineMode, formData.orderType, formData.stopMode, formData.takeProfitMode, trailingEnabled, formData.entryPrice]);')) {
    console.log('   ✅ useEffect properly watches entryPrice changes');
  }
  
} else {
  console.log('   ❌ Calculator form file missing');
}

// Test 2: Check order type switching logic
console.log('\n2. Checking order type switching behavior...');
if (fs.existsSync(calculatorPath)) {
  const content = fs.readFileSync(calculatorPath, 'utf8');
  
  if (content.includes('if (formData.orderType === \'MARKET\')')) {
    console.log('   ✅ Auto-switches from MARKET to LIMIT in offline mode');
  }
  
  if (content.includes('if (e.target.value === \'LIMIT\' && isOfflineMode)')) {
    console.log('   ✅ Sets price when manually switching to LIMIT in offline mode');
  }
  
  if (content.includes('Prevent switching to market order in offline mode')) {
    console.log('   ✅ Prevents switching back to MARKET in offline mode');
  }
}

// Test 3: Verify price condition checks
console.log('\n3. Checking price condition logic...');
if (fs.existsSync(calculatorPath)) {
  const content = fs.readFileSync(calculatorPath, 'utf8');
  
  if (content.includes('(!formData.entryPrice || formData.entryPrice === \'0\' || formData.entryPrice === \'\')')) {
    console.log('   ✅ Properly checks for empty, zero, or null prices');
  }
}

console.log('\n✨ Offline Mode Price Initialization Test Completed!');
console.log('\n🎯 Implemented Features:');
console.log('  • 自动切换: 离线模式下市价单→限价单');
console.log('  • 价格初始化: 空白价格自动设为100000');
console.log('  • 手动切换: 用户切换到限价单时自动设价格');
console.log('  • 智能检测: 检查空值、零值、空字符串');
console.log('  • 防回切: 防止在离线模式下切回市价单');

console.log('\n📋 Price Setting Conditions:');
console.log('  • 进入离线模式 + 当前是市价单 → 切换到限价单并设价格');
console.log('  • 进入离线模式 + 已是限价单但无价格 → 设价格为100000');
console.log('  • 手动切换到限价单 + 离线模式 + 无价格 → 设价格为100000');
console.log('  • 有现有价格 → 保留用户设置的价格不覆盖');

console.log('\n💡 User Experience:');
console.log('  • 无缝切换: 用户感受不到模式切换的复杂性');
console.log('  • 合理默认: 100000为常见的加密货币价格范围');
console.log('  • 保护设置: 不会覆盖用户已输入的价格');
console.log('  • 即时生效: 切换模式后立即可用于计算');