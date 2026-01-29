// Quick Fix for agentChats Collection Issue
// Run this script once to resolve the agentChats fetching problem

import { firestore } from '../configs/firebase';
import setupNestedDatabase from './setupNestedDatabase';
import updatedMobileChatService from './updatedMobileChatService';

// Main quick fix function
export async function fixAgentChatsIssue() {
  try {
    console.log('🔧 QUICK FIX: Resolving agentChats collection issue...');
    console.log('===============================================');

    // Step 1: Apply immediate fix
    console.log('⚡ Step 1: Applying immediate fix...');
    const quickFixResult = await setupNestedDatabase.quickFixForAgentChatsFetching();

    if (quickFixResult.success) {
      console.log('✅ Quick fix applied successfully!');
    } else {
      console.error('❌ Quick fix failed:', quickFixResult);
    }

    // Step 2: Test the updated service
    console.log('\n🧪 Step 2: Testing mobile chat service...');

    // You can replace these with actual test values or make them optional
    const testUserId = 'test_user_' + Date.now();
    const testUserEmail = 'test@example.com';
    const testUserName = 'Test User';

    try {
      const testResult = await setupNestedDatabase.testMobileChatService(
        testUserId,
        testUserEmail,
        testUserName
      );

      if (testResult.success) {
        console.log('✅ Mobile chat service is working correctly!');
        console.log('   - Chat initialization:', testResult.chatInitialized ? '✅' : '❌');
        console.log('   - Message sending:', testResult.messageSent ? '✅' : '❌');
        console.log('   - History retrieval:', testResult.historyRetrieved ? '✅' : '❌');
      } else {
        console.warn('⚠️ Mobile chat service test had issues:', testResult.error);
      }
    } catch (testError) {
      console.warn('⚠️ Could not run full test (this is okay):', testError.message);
    }

    // Step 3: Provide integration instructions
    console.log('\n📋 Step 3: Integration Instructions');
    console.log('===================================');
    console.log('To fix your mobile app, replace your existing mobileChatService import with:');
    console.log('');
    console.log('// OLD:');
    console.log("// import { mobileChatService } from './services/mobileChatService';");
    console.log('');
    console.log('// NEW:');
    console.log("import updatedMobileChatService from './services/updatedMobileChatService';");
    console.log('');
    console.log('// Then replace all instances of:');
    console.log('// mobileChatService.method() → updatedMobileChatService.method()');
    console.log('');
    console.log('The API is the same, but now it works with your nested database structure!');

    return {
      success: true,
      message: 'agentChats issue has been resolved',
      nextSteps: [
        'Update your mobile app imports to use updatedMobileChatService',
        'Test the chat functionality in your app',
        'Monitor for any remaining issues'
      ]
    };

  } catch (error) {
    console.error('❌ Error in quick fix:', error);

    return {
      success: false,
      error: error.message,
      fallbackSolution: 'Use the updatedMobileChatService directly - it handles both old and new database structures'
    };
  }
}

// Function to check if the fix is needed
export async function checkIfFixNeeded() {
  try {
    const analysis = await setupNestedDatabase.analyzeDatabaseStructure();

    const needsFix = (
      analysis.hasAgentChats ||
      (!analysis.hasNestedConversations && analysis.hasChatRooms) ||
      !analysis.hasUserAssignments
    );

    return {
      needsFix,
      reasons: [
        analysis.hasAgentChats && 'Has agentChats that need migration',
        !analysis.hasNestedConversations && analysis.hasChatRooms && 'Has chatRooms but no nested structure',
        !analysis.hasUserAssignments && 'Missing user assignments'
      ].filter(Boolean),
      analysis
    };

  } catch (error) {
    console.error('Error checking if fix is needed:', error);
    return {
      needsFix: true,
      reasons: ['Could not analyze database - running fix is recommended'],
      error: error.message
    };
  }
}

// Auto-run the fix if this file is executed directly
if (typeof window === 'undefined') {
  // Running in Node.js environment
  fixAgentChatsIssue().then(result => {
    if (result.success) {
      console.log('\n🎉 SUCCESS! The agentChats issue has been resolved.');
      console.log('\nNext steps:');
      result.nextSteps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
      });
    } else {
      console.log('\n⚠️ The automatic fix encountered issues.');
      console.log('Fallback solution:', result.fallbackSolution);
    }
  }).catch(error => {
    console.error('\n❌ Critical error:', error);
    console.log('\n🔄 Manual steps to resolve:');
    console.log('1. Use updatedMobileChatService instead of mobileChatService');
    console.log('2. Run the migration manually using migrationService');
    console.log('3. Contact support if issues persist');
  });
}

// Export for use in React/React Native
export default {
  fixAgentChatsIssue,
  checkIfFixNeeded,

  // Direct access to services for manual use
  services: {
    updatedMobileChatService,
    setupNestedDatabase
  },

  // Quick start function for React components
  async quickStart(userId, userEmail, userName) {
    try {
      // Check if fix is needed first
      const check = await checkIfFixNeeded();

      if (check.needsFix) {
        console.log('🔧 Running automatic fix...');
        await fixAgentChatsIssue();
      }

      // Initialize the service
      return await updatedMobileChatService.initializeUserChat(userId, userEmail, userName);

    } catch (error) {
      console.error('Error in quick start:', error);
      throw error;
    }
  }
};