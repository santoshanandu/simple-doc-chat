'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat, Message as AIMessage } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

// We're now using the AIMessage type from ai/react

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    onError: (err: Error) => {
      console.error('Chat error:', err);
    },
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Track scroll position to determine if user is at bottom
  const handleScroll = () => {
    if (messageContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 10;
      setIsAtBottom(isBottom);
    }
  };

  // Function to format citations in markdown
  const formatMessage = (message: AIMessage) => {
    if (message.role === 'assistant') {
      // Highlight citations like [1], [2], etc.
      return message.content.replace(/\[(\d+)\]/g, '**[$1]**');
    }
    return message.content;
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white shadow">
        <div className="flex justify-between items-center px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Q&A</h1>
          <Link 
            href="/admin" 
            className="px-4 py-2 text-white bg-gray-800 rounded hover:bg-gray-700"
          >
            Admin Panel
          </Link>
        </div>
      </header>

      <div 
        ref={messageContainerRef}
        className="overflow-y-auto flex-1 p-4 space-y-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <h2 className="text-xl font-medium text-gray-500">
              Ask questions about your documents
            </h2>
            <p className="mt-1 text-gray-400">
              The system will search through your ingested documents and provide answers with citations.
            </p>
          </div>
        )}

        {messages.map((message: AIMessage) => (
          <div
            key={message.id}
            className={`chat-message ${
              message.role === 'user' ? 'user-message' : 'assistant-message'
            }`}
          >
            <div className="mb-1 font-semibold">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="message-content">
              <ReactMarkdown>
                {formatMessage(message)}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
        
        {/* Show error message if any */}
        {error && (
          <div className="p-3 mt-2 text-red-700 bg-red-100 rounded-md">
            Error: {error.message}
          </div>
        )}
        
        {/* Show typing indicator when loading */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
}
