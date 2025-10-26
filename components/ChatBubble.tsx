
import React from 'react';
import type { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { role, content } = message;
  const isUser = role === 'user';

  const bubbleClasses = isUser
    ? 'bg-indigo-600 text-white self-end'
    : 'bg-gray-700 text-gray-200 self-start';
  
  const containerClasses = isUser
    ? 'flex justify-end'
    : 'flex justify-start';

  return (
    <div className={containerClasses}>
      <div className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow ${bubbleClasses}`}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

export default ChatBubble;
