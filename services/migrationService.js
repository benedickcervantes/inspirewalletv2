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

class MigrationService {
  constructor() {
    this.migrationProgress = new Map();
  }

  // Migrate from agentChats collection to nested structure
  async migrateAgentChatsToNested(options = {}) {
    try {
      const { batchSize = 10, logProgress = true } = options;

      console.log('🔄 Starting migration from agentChats to nested structure...');

      // Get all agentChats documents
      const agentChatsRef = collection(firestore, 'agentChats');
      const agentChatsSnapshot = await getDocs(agentChatsRef);

      if (agentChatsSnapshot.empty) {
        console.log('ℹ️ No agentChats found to migrate');
        return { success: true, migrated: 0 };
      }

      const totalChats = agentChatsSnapshot.size;
      let migratedCount = 0;
      let errorCount = 0;

      console.log(`📊 Found ${totalChats} agent chats to migrate`);

      // Process in batches
      const chats = agentChatsSnapshot.docs;
      for (let i = 0; i < chats.length; i += batchSize) {
        const batch = chats.slice(i, i + batchSize);

        try {
          await this.migrateChatBatch(batch);
          migratedCount += batch.length;

          if (logProgress && migratedCount % (batchSize * 2) === 0) {
            console.log(`📈 Progress: ${migratedCount}/${totalChats} chats migrated`);
          }

        } catch (error) {
          console.error('❌ Error migrating batch:', error);
          errorCount += batch.length;
        }
      }

      console.log(`✅ Migration completed: ${migratedCount} migrated, ${errorCount} errors`);

      return {
        success: true,
        total: totalChats,
        migrated: migratedCount,
        errors: errorCount
      };

    } catch (error) {
      console.error('❌ Error in migration process:', error);
      throw error;
    }
  }

  // Migrate a batch of chats
  async migrateChatBatch(chatDocs) {
    const batch = writeBatch(firestore);

    for (const chatDoc of chatDocs) {
      const chatId = chatDoc.id;
      const chatData = chatDoc.data();

      try {
        // Extract admin and user information
        const adminId = chatData.adminId || chatData.agentId;
        const userId = chatData.userId || chatData.customerId;

        if (!adminId || !userId) {
          console.warn(`⚠️ Skipping chat ${chatId}: missing adminId or userId`);
          continue;
        }

        // Create nested conversation structure
        const conversationId = chatId; // Keep same ID for reference

        // 1. Create admin user assignment if not exists
        const assignmentRef = doc(firestore, 'adminUsers', adminId, 'assignedUsers', userId);
        batch.set(assignmentRef, {
          userId,
          adminId,
          assignedAt: chatData.createdAt || serverTimestamp(),
          userInfo: {
            userName: chatData.userName || chatData.customerName || 'User',
            userEmail: chatData.userEmail || chatData.customerEmail || '',
            displayName: chatData.userName || chatData.customerName || 'User',
            platform: 'mobile'
          },
          status: 'active',
          conversationCount: 1,
          lastActivity: chatData.updatedAt || chatData.lastMessageAt || serverTimestamp()
        }, { merge: true });

        // 2. Create nested conversation
        const conversationRef = doc(
          firestore,
          'adminUsers', adminId,
          'assignedUsers', userId,
          'conversations', conversationId
        );

        const conversationData = {
          conversationId,
          adminId,
          userId,
          createdAt: chatData.createdAt || serverTimestamp(),
          updatedAt: chatData.updatedAt || chatData.lastMessageAt || serverTimestamp(),
          status: chatData.status || 'active',
          isActive: chatData.isActive !== false,
          messageCount: chatData.messageCount || 0,
          lastMessage: chatData.lastMessage ? {
            content: chatData.lastMessage,
            senderId: chatData.lastMessageSender === 'admin' ? adminId : userId,
            senderType: chatData.lastMessageSender || 'user',
            timestamp: chatData.lastMessageAt || serverTimestamp()
          } : null,
          unreadCounts: {
            admin: chatData.unreadCount || 0,
            user: 0
          },
          userInfo: {
            userName: chatData.userName || chatData.customerName || 'User',
            userEmail: chatData.userEmail || chatData.customerEmail || '',
            displayName: chatData.userName || chatData.customerName || 'User',
            platform: 'mobile'
          },
          userOnline: chatData.userOnline || false,
          adminOnline: chatData.adminOnline || false,
          // Migration metadata
          migratedFrom: 'agentChats',
          migratedAt: serverTimestamp(),
          originalChatId: chatId
        };

        batch.set(conversationRef, conversationData);

        // 3. Create backward-compatible chatRoom entry
        const chatRoomRef = doc(firestore, 'chatRooms', conversationId);
        batch.set(chatRoomRef, {
          ...chatData,
          // Reference to nested structure
          nestedConversationPath: `adminUsers/${adminId}/assignedUsers/${userId}/conversations/${conversationId}`,
          migratedFrom: 'agentChats',
          migratedAt: serverTimestamp()
        }, { merge: true });

        // 4. Migrate associated messages
        await this.migrateChatMessages(chatId, adminId, userId, conversationId);

      } catch (error) {
        console.error(`❌ Error migrating chat ${chatId}:`, error);
      }
    }

    await batch.commit();
  }

  // Migrate messages for a specific chat
  async migrateChatMessages(originalChatId, adminId, userId, conversationId) {
    try {
      // Get messages from old structure (you might need to adjust this query based on your actual structure)
      const messagesQueries = [
        // Try different possible message collection structures
        query(collection(firestore, 'messages'), where('chatRoomId', '==', originalChatId)),
        query(collection(firestore, 'chatMessages'), where('chatId', '==', originalChatId)),
        query(collection(firestore, 'agentChatMessages'), where('chatId', '==', originalChatId))
      ];

      let messages = [];

      for (const messagesQuery of messagesQueries) {
        try {
          const messagesSnapshot = await getDocs(messagesQuery);
          if (!messagesSnapshot.empty) {
            messages = messagesSnapshot.docs;
            break;
          }
        } catch (error) {
          // Continue to next query if this one fails
          continue;
        }
      }

      if (messages.length === 0) {
        console.log(`ℹ️ No messages found for chat ${originalChatId}`);
        return;
      }

      console.log(`📨 Migrating ${messages.length} messages for chat ${originalChatId}`);

      // Migrate messages in batches
      const messageBatch = writeBatch(firestore);
      let messageCount = 0;

      for (const messageDoc of messages) {
        const messageData = messageDoc.data();
        const messageId = messageDoc.id;

        const nestedMessageRef = doc(
          firestore,
          'adminUsers', adminId,
          'assignedUsers', userId,
          'conversations', conversationId,
          'messages', messageId
        );

        const migratedMessageData = {
          id: messageId,
          content: messageData.message || messageData.content || '',
          senderId: messageData.senderId || (messageData.senderType === 'admin' ? adminId : userId),
          senderType: messageData.senderType || 'user',
          senderName: messageData.senderName || 'Unknown',
          timestamp: messageData.timestamp || serverTimestamp(),
          readBy: messageData.readBy || [],
          deliveryStatus: messageData.deliveryStatus || 'sent',
          messageType: messageData.messageType || 'text',
          platform: 'mobile',
          // Migration metadata
          migratedFrom: 'messages',
          migratedAt: serverTimestamp(),
          originalMessageId: messageId
        };

        messageBatch.set(nestedMessageRef, migratedMessageData);
        messageCount++;

        // Commit in batches of 500 (Firestore limit)
        if (messageCount % 500 === 0) {
          await messageBatch.commit();
          console.log(`📨 Migrated ${messageCount} messages for chat ${originalChatId}`);
        }
      }

      // Commit remaining messages
      if (messageCount % 500 !== 0) {
        await messageBatch.commit();
      }

      console.log(`✅ Successfully migrated ${messageCount} messages for chat ${originalChatId}`);

    } catch (error) {
      console.error(`❌ Error migrating messages for chat ${originalChatId}:`, error);
    }
  }

  // Create missing user assignments from existing chats
  async createMissingUserAssignments() {
    try {
      console.log('🔄 Creating missing user assignments...');

      // Get all user assignments
      const assignmentsRef = collection(firestore, 'userAssignments');
      const assignmentsSnapshot = await getDocs(assignmentsRef);

      const existingAssignments = new Set();
      assignmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingAssignments.add(`${data.adminId}_${data.userId}`);
      });

      // Get all chat rooms to find missing assignments
      const chatRoomsRef = collection(firestore, 'chatRooms');
      const chatRoomsSnapshot = await getDocs(chatRoomsRef);

      const batch = writeBatch(firestore);
      let createdCount = 0;

      chatRoomsSnapshot.docs.forEach(doc => {
        const chatData = doc.data();
        const adminId = chatData.adminId;
        const userId = chatData.userId;

        if (adminId && userId) {
          const assignmentKey = `${adminId}_${userId}`;

          if (!existingAssignments.has(assignmentKey)) {
            const assignmentRef = doc(firestore, 'userAssignments', userId);

            batch.set(assignmentRef, {
              userId,
              adminId,
              assignedAt: chatData.createdAt || serverTimestamp(),
              userProfile: {
                email: chatData.userEmail || '',
                displayName: chatData.userName || 'User',
                firstName: chatData.userName || 'User',
                lastName: '',
                platform: 'mobile'
              },
              status: 'active',
              // Migration metadata
              createdFromMigration: true,
              migratedAt: serverTimestamp()
            });

            createdCount++;
          }
        }
      });

      if (createdCount > 0) {
        await batch.commit();
      }

      console.log(`✅ Created ${createdCount} missing user assignments`);

      return { success: true, created: createdCount };

    } catch (error) {
      console.error('❌ Error creating missing user assignments:', error);
      throw error;
    }
  }

  // Verify migration integrity
  async verifyMigration() {
    try {
      console.log('🔍 Verifying migration integrity...');

      const results = {
        agentChats: 0,
        chatRooms: 0,
        nestedConversations: 0,
        userAssignments: 0,
        messages: {
          old: 0,
          nested: 0
        }
      };

      // Count original agentChats
      const agentChatsSnapshot = await getDocs(collection(firestore, 'agentChats'));
      results.agentChats = agentChatsSnapshot.size;

      // Count chatRooms
      const chatRoomsSnapshot = await getDocs(collection(firestore, 'chatRooms'));
      results.chatRooms = chatRoomsSnapshot.size;

      // Count user assignments
      const assignmentsSnapshot = await getDocs(collection(firestore, 'userAssignments'));
      results.userAssignments = assignmentsSnapshot.size;

      // Count nested conversations (this is more complex due to nested structure)
      const adminUsersSnapshot = await getDocs(collection(firestore, 'adminUsers'));
      let nestedConversationsCount = 0;

      for (const adminDoc of adminUsersSnapshot.docs) {
        const assignedUsersSnapshot = await getDocs(
          collection(firestore, 'adminUsers', adminDoc.id, 'assignedUsers')
        );

        for (const userDoc of assignedUsersSnapshot.docs) {
          const conversationsSnapshot = await getDocs(
            collection(firestore, 'adminUsers', adminDoc.id, 'assignedUsers', userDoc.id, 'conversations')
          );

          nestedConversationsCount += conversationsSnapshot.size;
        }
      }

      results.nestedConversations = nestedConversationsCount;

      // Count messages
      const oldMessagesSnapshot = await getDocs(collection(firestore, 'messages'));
      results.messages.old = oldMessagesSnapshot.size;

      console.log('📊 Migration Verification Results:');
      console.log(`   Original agentChats: ${results.agentChats}`);
      console.log(`   ChatRooms: ${results.chatRooms}`);
      console.log(`   Nested conversations: ${results.nestedConversations}`);
      console.log(`   User assignments: ${results.userAssignments}`);
      console.log(`   Old messages: ${results.messages.old}`);

      return results;

    } catch (error) {
      console.error('❌ Error verifying migration:', error);
      throw error;
    }
  }

  // Clean up old data after successful migration (BE CAREFUL!)
  async cleanupOldData(confirmCleanup = false) {
    if (!confirmCleanup) {
      throw new Error('Cleanup requires explicit confirmation. Set confirmCleanup=true');
    }

    try {
      console.log('🗑️  Starting cleanup of old data...');

      // This is dangerous - only run after verifying migration is successful
      console.log('⚠️  This will permanently delete old agentChats data!');

      // Delete agentChats collection (in batches)
      const agentChatsSnapshot = await getDocs(collection(firestore, 'agentChats'));
      const batch = writeBatch(firestore);
      let deleteCount = 0;

      agentChatsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;

        if (deleteCount % 500 === 0) {
          // Firestore batch limit
          batch.commit();
          console.log(`🗑️  Deleted ${deleteCount} agentChats documents`);
        }
      });

      if (deleteCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`✅ Cleanup completed: ${deleteCount} documents deleted`);

      return { success: true, deleted: deleteCount };

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  // Get migration progress
  getMigrationProgress(migrationId) {
    return this.migrationProgress.get(migrationId) || {
      status: 'not_started',
      progress: 0,
      total: 0
    };
  }

  // Set migration progress
  setMigrationProgress(migrationId, progress) {
    this.migrationProgress.set(migrationId, progress);
  }
}

const migrationService = new MigrationService();
export default migrationService;