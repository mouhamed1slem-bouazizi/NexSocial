const express = require('express');
const { requireUser } = require('./middleware/auth.js');
const SocialAccountService = require('../services/socialAccountService.js');

const router = express.Router();

// Store messages in memory for demo (in production, use database)
let messageStore = new Map();

// Get Line conversations for a user
router.get('/conversations', requireUser, async (req, res) => {
  try {
    console.log('📱 Fetching Line conversations for user:', req.user._id);
    
    // Get user's Line accounts
    const lineAccounts = await SocialAccountService.getByUserId(req.user._id);
    const lineAccount = lineAccounts.find(account => account.platform === 'line');
    
    if (!lineAccount) {
      return res.json({
        success: true,
        conversations: [],
        messages: []
      });
    }

    // Get conversations from message store
    const userMessages = messageStore.get(req.user._id) || [];
    
    // Group messages by conversation (sender)
    const conversations = {};
    userMessages.forEach(message => {
      const conversationId = message.sender.userId;
      if (!conversations[conversationId]) {
        conversations[conversationId] = {
          id: conversationId,
          participant: message.sender,
          lastMessage: message,
          unreadCount: 0,
          messages: []
        };
      }
      conversations[conversationId].messages.push(message);
      if (!message.isRead && message.type === 'received') {
        conversations[conversationId].unreadCount++;
      }
      // Update last message if this one is more recent
      if (new Date(message.timestamp) > new Date(conversations[conversationId].lastMessage.timestamp)) {
        conversations[conversationId].lastMessage = message;
      }
    });

    // Sort conversations by last message timestamp
    const sortedConversations = Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );

    res.json({
      success: true,
      conversations: sortedConversations,
      messages: userMessages,
      lineAccount: {
        displayName: lineAccount.display_name,
        profileImage: lineAccount.profile_image
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Line conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send a Line message
router.post('/send', requireUser, async (req, res) => {
  try {
    const { recipientId, message, conversationId } = req.body;
    
    console.log('📤 Sending Line message:', { recipientId, message, conversationId });
    
    // Get user's Line account
    const lineAccounts = await SocialAccountService.getByUserId(req.user._id);
    const lineAccount = lineAccounts.find(account => account.platform === 'line');
    
    if (!lineAccount) {
      return res.status(400).json({
        success: false,
        error: 'No Line account connected'
      });
    }

    // In a real implementation, you would use Line Messaging API here
    // For demo purposes, we'll simulate sending and store the message
    
    const sentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'sent',
      content: message,
      timestamp: new Date().toISOString(),
      sender: {
        userId: lineAccount.platform_user_id,
        displayName: lineAccount.display_name,
        pictureUrl: lineAccount.profile_image
      },
      recipient: {
        userId: recipientId
      },
      isRead: true,
      platform: 'line'
    };

    // Store the sent message
    const userMessages = messageStore.get(req.user._id) || [];
    userMessages.push(sentMessage);
    messageStore.set(req.user._id, userMessages);

    // Simulate receiving a reply after 2-5 seconds
    setTimeout(() => {
      const replyMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'received',
        content: getSimulatedReply(message),
        timestamp: new Date().toISOString(),
        sender: {
          userId: recipientId,
          displayName: `Line User ${recipientId.slice(-4)}`,
          pictureUrl: `https://via.placeholder.com/100/4ade80/ffffff?text=${recipientId.slice(-2)}`
        },
        recipient: {
          userId: lineAccount.platform_user_id
        },
        isRead: false,
        platform: 'line'
      };

      const currentMessages = messageStore.get(req.user._id) || [];
      currentMessages.push(replyMessage);
      messageStore.set(req.user._id, currentMessages);
    }, Math.random() * 3000 + 2000);

    console.log('✅ Line message sent successfully');

    res.json({
      success: true,
      message: sentMessage
    });

  } catch (error) {
    console.error('❌ Error sending Line message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark messages as read
router.post('/mark-read', requireUser, async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    console.log('👁️ Marking Line messages as read for conversation:', conversationId);
    
    const userMessages = messageStore.get(req.user._id) || [];
    
    // Mark all messages from this conversation as read
    userMessages.forEach(message => {
      if (message.sender.userId === conversationId && message.type === 'received') {
        message.isRead = true;
      }
    });
    
    messageStore.set(req.user._id, userMessages);

    res.json({
      success: true
    });

  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start a new conversation (demo endpoint)
router.post('/start-conversation', requireUser, async (req, res) => {
  try {
    console.log('🆕 Starting new Line conversation for user:', req.user._id);
    
    // Get user's Line account
    const lineAccounts = await SocialAccountService.getByUserId(req.user._id);
    const lineAccount = lineAccounts.find(account => account.platform === 'line');
    
    if (!lineAccount) {
      return res.status(400).json({
        success: false,
        error: 'No Line account connected'
      });
    }

    // Simulate a new conversation with a random user
    const randomUserId = `line_user_${Math.random().toString(36).substr(2, 9)}`;
    const welcomeMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'received',
      content: '👋 Hello! Thanks for connecting with me on Line. How can I help you today?',
      timestamp: new Date().toISOString(),
      sender: {
        userId: randomUserId,
        displayName: `Line User ${randomUserId.slice(-4)}`,
        pictureUrl: `https://via.placeholder.com/100/06b6d4/ffffff?text=${randomUserId.slice(-2)}`
      },
      recipient: {
        userId: lineAccount.platform_user_id
      },
      isRead: false,
      platform: 'line'
    };

    const userMessages = messageStore.get(req.user._id) || [];
    userMessages.push(welcomeMessage);
    messageStore.set(req.user._id, userMessages);

    res.json({
      success: true,
      message: welcomeMessage,
      conversationId: randomUserId
    });

  } catch (error) {
    console.error('❌ Error starting Line conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Line webhook handler (for receiving messages from Line)
router.post('/webhook', async (req, res) => {
  try {
    console.log('🪝 Line webhook received:', JSON.stringify(req.body, null, 2));
    
    // In a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Process different event types (message, follow, unfollow, etc.)
    // 3. Store messages in database
    // 4. Send real-time updates to frontend
    
    const events = req.body.events || [];
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        console.log('📨 Received Line text message:', event.message.text);
        
        // Here you would typically:
        // - Find the user associated with this Line account
        // - Store the message in the database
        // - Send real-time notification to the user's dashboard
      }
    }

    // Always respond with 200 OK to Line
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Line webhook error:', error);
    res.status(200).json({ success: true }); // Still respond OK to prevent retries
  }
});

// Helper function to generate simulated replies
function getSimulatedReply(originalMessage) {
  const replies = [
    "Thanks for your message! 😊",
    "That's interesting! Tell me more.",
    "I appreciate you reaching out.",
    "Let me think about that... 🤔",
    "Great point! I hadn't considered that.",
    "Thanks for sharing that with me!",
    "That sounds really exciting!",
    "I'd love to learn more about this.",
    "Thank you for taking the time to message me.",
    "This is very helpful information!"
  ];
  
  // Simple keyword-based responses
  const lowerMessage = originalMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! Nice to meet you! 👋";
  }
  if (lowerMessage.includes('how are you')) {
    return "I'm doing great, thank you for asking! How about you? 😊";
  }
  if (lowerMessage.includes('thank')) {
    return "You're very welcome! Happy to help! 🙌";
  }
  if (lowerMessage.includes('help')) {
    return "I'd be happy to help! What do you need assistance with?";
  }
  if (lowerMessage.includes('question')) {
    return "Sure! Feel free to ask me anything.";
  }
  
  // Random reply for other messages
  return replies[Math.floor(Math.random() * replies.length)];
}

module.exports = router; 