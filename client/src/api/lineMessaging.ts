import api from './api';

export interface LineMessage {
  id: string;
  type: 'sent' | 'received';
  content: string;
  timestamp: string;
  sender: {
    userId: string;
    displayName: string;
    pictureUrl: string;
  };
  recipient: {
    userId: string;
  };
  isRead: boolean;
  platform: 'line';
}

export interface LineConversation {
  id: string;
  participant: {
    userId: string;
    displayName: string;
    pictureUrl: string;
  };
  lastMessage: LineMessage;
  unreadCount: number;
  messages: LineMessage[];
}

export interface LineConversationsResponse {
  success: boolean;
  conversations: LineConversation[];
  messages: LineMessage[];
  lineAccount?: {
    displayName: string;
    profileImage: string;
  };
}

// Get Line conversations for the current user
export const getLineConversations = async (): Promise<LineConversationsResponse> => {
  try {
    console.log('📱 Fetching Line conversations...');
    const response = await api.get('/line-messaging/conversations');
    console.log('✅ Line conversations fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching Line conversations:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch Line conversations');
  }
};

// Send a Line message
export const sendLineMessage = async (recipientId: string, message: string, conversationId?: string): Promise<{ success: boolean; message: LineMessage }> => {
  try {
    console.log('📤 Sending Line message to:', recipientId);
    const response = await api.post('/line-messaging/send', {
      recipientId,
      message,
      conversationId
    });
    console.log('✅ Line message sent successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error sending Line message:', error);
    throw new Error(error.response?.data?.error || 'Failed to send Line message');
  }
};

// Mark messages as read
export const markLineMessagesAsRead = async (conversationId: string): Promise<{ success: boolean }> => {
  try {
    console.log('👁️ Marking Line messages as read for conversation:', conversationId);
    const response = await api.post('/line-messaging/mark-read', {
      conversationId
    });
    console.log('✅ Line messages marked as read successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error marking Line messages as read:', error);
    throw new Error(error.response?.data?.error || 'Failed to mark messages as read');
  }
};

// Start a new Line conversation (demo)
export const startLineConversation = async (): Promise<{ success: boolean; message: LineMessage; conversationId: string }> => {
  try {
    console.log('🆕 Starting new Line conversation...');
    const response = await api.post('/line-messaging/start-conversation');
    console.log('✅ New Line conversation started:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error starting Line conversation:', error);
    throw new Error(error.response?.data?.error || 'Failed to start Line conversation');
  }
}; 