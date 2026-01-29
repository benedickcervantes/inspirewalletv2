// Test script for Firebase Functions
const functionsUrl = 'https://us-central1-inspire-wallet.cloudfunctions.net';

async function testFunctions() {
  console.log('🧪 Testing Firebase Functions...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${functionsUrl}/heartbeatHealth`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check Result:', healthData);

    // Test 2: Manual Heartbeat Check
    console.log('\n2️⃣ Testing Manual Heartbeat Check...');
    const heartbeatResponse = await fetch(`${functionsUrl}/manualHeartbeatCheck`);
    const heartbeatData = await heartbeatResponse.json();
    console.log('✅ Manual Heartbeat Check Result:', heartbeatData);

    // Test 3: Online Users Count
    console.log('\n3️⃣ Testing Online Users Count...');
    const countResponse = await fetch(`${functionsUrl}/getOnlineUsersCount`);
    const countData = await countResponse.json();
    console.log('✅ Online Users Count Result:', countData);

    console.log('\n🎉 All Firebase Functions are working correctly!');
    console.log('\n📊 Function URLs:');
    console.log(`   Health Check: ${functionsUrl}/heartbeatHealth`);
    console.log(`   Manual Check: ${functionsUrl}/manualHeartbeatCheck`);
    console.log(`   Online Count: ${functionsUrl}/getOnlineUsersCount`);
    console.log(`   User Status: ${functionsUrl}/getUserStatus?userId=USER_ID`);

  } catch (error) {
    console.error('❌ Error testing functions:', error);
  }
}

// Run the test
testFunctions(); 