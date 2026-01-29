import { firestore } from '../configs/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import migrationService from './migrationService';
import updatedMobileChatService from './updatedMobileChatService';

class SetupNestedDatabase {
  constructor() {
    this.setupProgress = {
      step: 'not_started',
      progress: 0,
      total: 0,
      message: ''
    };
  }

  // Main setup function to fix agentChats issue
  async setupDatabase(options = {}) {
    try {
      console.log('🚀 Setting up nested database structure...');

      const {
        migrateExistingData = true,
        createBackwardCompatibility = true,
        verifySetup = true
      } = options;

      // Step 1: Check current database structure
      console.log('📊 Step 1: Analyzing current database structure...');
      const analysis = await this.analyzeDatabaseStructure();
      console.log('   Analysis:', analysis);

      // Step 2: Migrate existing agentChats if needed
      if (migrateExistingData && analysis.hasAgentChats) {
        console.log('🔄 Step 2: Migrating agentChats to nested structure...');
        await migrationService.migrateAgentChatsToNested({
          batchSize: 10,
          logProgress: true
        });
      } else {
        console.log('⏭️  Step 2: Skipping migration (no agentChats or disabled)');
      }

      // Step 3: Create missing user assignments
      console.log('👤 Step 3: Creating missing user assignments...');
      await migrationService.createMissingUserAssignments();

      // Step 4: Create backward compatibility structures
      if (createBackwardCompatibility) {
        console.log('🔗 Step 4: Creating backward compatibility structures...');
        await this.createBackwardCompatibilityStructures();
      } else {
        console.log('⏭️  Step 4: Skipping backward compatibility');
      }

      // Step 5: Verify setup
      if (verifySetup) {
        console.log('✅ Step 5: Verifying setup...');
        const verification = await migrationService.verifyMigration();
        console.log('   Verification results:', verification);
      }

      console.log('🎉 Database setup completed successfully!');

      return {
        success: true,
        analysis,
        message: 'Database setup completed successfully'
      };

    } catch (error) {
      console.error('❌ Error setting up database:', error);
      throw error;
    }
  }

  // Analyze current database structure
  async analyzeDatabaseStructure() {
    try {
      const analysis = {
        hasAgentChats: false,
        hasChatRooms: false,
        hasNestedConversations: false,
        hasUserAssignments: false,
        counts: {
          agentChats: 0,
          chatRooms: 0,
          nestedConversations: 0,
          userAssignments: 0,
          messages: 0
        },
        recommendations: []
      };

      // Check agentChats
      try {
        const agentChatsSnapshot = await getDocs(collection(firestore, 'agentChats'));
        analysis.hasAgentChats = !agentChatsSnapshot.empty;
        analysis.counts.agentChats = agentChatsSnapshot.size;

        if (analysis.hasAgentChats) {
          analysis.recommendations.push('Migrate agentChats to nested structure');
        }
      } catch (error) {
        console.log('ℹ️ agentChats collection does not exist or is inaccessible');
      }

      // Check chatRooms
      try {
        const chatRoomsSnapshot = await getDocs(collection(firestore, 'chatRooms'));
        analysis.hasChatRooms = !chatRoomsSnapshot.empty;
        analysis.counts.chatRooms = chatRoomsSnapshot.size;
      } catch (error) {
        console.log('ℹ️ chatRooms collection does not exist');
      }

      // Check userAssignments
      try {
        const assignmentsSnapshot = await getDocs(collection(firestore, 'userAssignments'));
        analysis.hasUserAssignments = !assignmentsSnapshot.empty;
        analysis.counts.userAssignments = assignmentsSnapshot.size;

        if (!analysis.hasUserAssignments && analysis.hasChatRooms) {
          analysis.recommendations.push('Create user assignments from existing chatRooms');
        }
      } catch (error) {
        console.log('ℹ️ userAssignments collection does not exist');
      }

      // Check nested conversations
      try {
        const adminUsersSnapshot = await getDocs(collection(firestore, 'adminUsers'));
        let nestedCount = 0;

        for (const adminDoc of adminUsersSnapshot.docs) {
          try {
            const assignedUsersSnapshot = await getDocs(
              collection(firestore, 'adminUsers', adminDoc.id, 'assignedUsers')
            );

            for (const userDoc of assignedUsersSnapshot.docs) {
              try {
                const conversationsSnapshot = await getDocs(
                  collection(firestore, 'adminUsers', adminDoc.id, 'assignedUsers', userDoc.id, 'conversations')
                );
                nestedCount += conversationsSnapshot.size;
              } catch (convError) {
                // Continue if can't access conversations
              }
            }
          } catch (userError) {
            // Continue if can't access assigned users
          }
        }

        analysis.hasNestedConversations = nestedCount > 0;
        analysis.counts.nestedConversations = nestedCount;
      } catch (error) {
        console.log('ℹ️ No nested conversation structure found');
      }

      // Check messages
      try {
        const messagesSnapshot = await getDocs(collection(firestore, 'messages'));
        analysis.counts.messages = messagesSnapshot.size;
      } catch (error) {
        console.log('ℹ️ messages collection does not exist');
      }

      return analysis;

    } catch (error) {
      console.error('❌ Error analyzing database structure:', error);
      throw error;
    }
  }

  // Create backward compatibility structures
  async createBackwardCompatibilityStructures() {
    try {
      // Get all nested conversations and create chatRoom entries for them
      const adminUsersSnapshot = await getDocs(collection(firestore, 'adminUsers'));
      const batch = writeBatch(firestore);
      let createdCount = 0;

      for (const adminDoc of adminUsersSnapshot.docs) {
        const adminId = adminDoc.id;

        try {
          const assignedUsersSnapshot = await getDocs(
            collection(firestore, 'adminUsers', adminId, 'assignedUsers')
          );

          for (const userDoc of assignedUsersSnapshot.docs) {
            const userId = userDoc.id;
            const userInfo = userDoc.data();

            try {
              const conversationsSnapshot = await getDocs(
                collection(firestore, 'adminUsers', adminId, 'assignedUsers', userId, 'conversations')
              );

              for (const convDoc of conversationsSnapshot.docs) {
                const conversationId = convDoc.id;
                const convData = convDoc.data();

                // Create backward-compatible chatRoom
                const chatRoomRef = doc(firestore, 'chatRooms', conversationId);

                batch.set(chatRoomRef, {
                  userId,
                  adminId,
                  userEmail: userInfo.userInfo?.userEmail || '',
                  userName: userInfo.userInfo?.userName || 'User',
                  adminName: 'Admin', // You might want to fetch this from admin data
                  adminEmail: '',
                  createdAt: convData.createdAt || serverTimestamp(),
                  lastMessageAt: convData.updatedAt || serverTimestamp(),
                  isActive: convData.status === 'active',
                  unreadCount: convData.unreadCounts?.user || 0,
                  lastMessage: convData.lastMessage?.content || '',
                  lastMessageSender: convData.lastMessage?.senderType || 'user',
                  userOnline: convData.userOnline || false,
                  adminOnline: convData.adminOnline || false,
                  // Reference to nested structure
                  nestedConversationPath: `adminUsers/${adminId}/assignedUsers/${userId}/conversations/${conversationId}`,
                  createdFromNested: true,
                  createdAt: serverTimestamp()
                }, { merge: true });

                createdCount++;

                // Commit in batches
                if (createdCount % 500 === 0) {
                  await batch.commit();
                  console.log(`🔗 Created ${createdCount} backward compatibility entries`);
                }
              }
            } catch (convError) {
              console.warn(`⚠️ Could not process conversations for user ${userId}:`, convError);
            }
          }
        } catch (userError) {
          console.warn(`⚠️ Could not process assigned users for admin ${adminId}:`, userError);
        }
      }

      // Commit remaining entries
      if (createdCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`✅ Created ${createdCount} backward compatibility structures`);

      return { success: true, created: createdCount };

    } catch (error) {
      console.error('❌ Error creating backward compatibility structures:', error);
      throw error;
    }
  }

  // Test the updated mobile chat service
  async testMobileChatService(testUserId, testUserEmail, testUserName) {
    try {
      console.log('🧪 Testing updated mobile chat service...');

      // Initialize chat
      const result = await updatedMobileChatService.initializeUserChat(
        testUserId,
        testUserEmail,
        testUserName
      );

      console.log('✅ Chat initialization result:', {
        success: result.success,
        conversationId: result.conversationId,
        adminName: result.adminName,
        adminOnline: result.adminOnline
      });

      // Test sending a message
      const messageResult = await updatedMobileChatService.sendMessageToAdmin(
        testUserId,
        result.conversationId,
        'Test message from setup script',
        testUserName
      );

      console.log('✅ Message sending result:', {
        success: messageResult.success,
        messageId: messageResult.messageId
      });

      // Test getting chat history
      const history = await updatedMobileChatService.getChatHistory(
        result.conversationId,
        testUserId,
        10
      );

      console.log('✅ Chat history result:', {
        messageCount: history.length
      });

      return {
        success: true,
        chatInitialized: result.success,
        messageSent: messageResult.success,
        historyRetrieved: history.length > 0
      };

    } catch (error) {
      console.error('❌ Error testing mobile chat service:', error);
      return { success: false, error: error.message };
    }
  }

  // Quick fix for apps still fetching agentChats
  async quickFixForAgentChatsFetching() {
    try {
      console.log('⚡ Applying quick fix for agentChats fetching...');

      // Check if agentChats collection exists and has data
      const agentChatsSnapshot = await getDocs(collection(firestore, 'agentChats'));

      if (agentChatsSnapshot.empty) {
        console.log('ℹ️ No agentChats found - creating dummy structure or redirecting to chatRooms');

        // Option 1: Create a simple redirect document
        const redirectDoc = doc(firestore, 'agentChats', '_redirect');
        await setDoc(redirectDoc, {
          message: 'agentChats has been migrated to nested structure',
          useCollection: 'chatRooms',
          timestamp: serverTimestamp()
        });

        console.log('✅ Created redirect document in agentChats');
      } else {
        console.log(`ℹ️ Found ${agentChatsSnapshot.size} agentChats - running migration...`);

        // Run the migration
        await migrationService.migrateAgentChatsToNested({
          batchSize: 5,
          logProgress: true
        });

        console.log('✅ Migration completed');
      }

      // Ensure chatRooms collection exists and is populated
      const chatRoomsSnapshot = await getDocs(collection(firestore, 'chatRooms'));

      if (chatRoomsSnapshot.empty) {
        console.log('ℹ️ No chatRooms found - creating from nested structure...');
        await this.createBackwardCompatibilityStructures();
      } else {
        console.log(`✅ Found ${chatRoomsSnapshot.size} chatRooms`);
      }

      return {
        success: true,
        message: 'Quick fix applied successfully'
      };

    } catch (error) {
      console.error('❌ Error applying quick fix:', error);
      throw error;
    }
  }

  // Get setup progress
  getSetupProgress() {
    return this.setupProgress;
  }
}

const setupNestedDatabase = new SetupNestedDatabase();
export default setupNestedDatabase;