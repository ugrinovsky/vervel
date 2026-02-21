import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { chatApi } from '@/api/chat';
import type { ChatMessage } from '@/api/trainer';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface ChatBoxProps {
  chatId: number;
  className?: string;
}

export default function ChatBox({ chatId, className = '' }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (markRead = false) => {
    try {
      const res = await chatApi.getMessages(chatId);
      setMessages(res.data.data);
      if (loading) {
        setTimeout(scrollToBottom, 100);
      }
      if (markRead) {
        chatApi.markAsRead(chatId).catch(() => {});
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (loading) {
        toast.error('Ошибка загрузки сообщений');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true); // mark as read on open

    // Polling every 10 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await chatApi.sendMessage(chatId, messageContent);
      setMessages((prev) => [...prev, res.data.data]);
      scrollToBottom();
    } catch {
      toast.error('Ошибка отправки сообщения');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-[var(--color_text_muted)]">Загрузка чата...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm text-[var(--color_text_muted)]">
              Пока нет сообщений. Начните беседу!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === user?.id;
              const showSender =
                index === 0 || messages[index - 1].senderId !== message.senderId;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] ${
                      isCurrentUser
                        ? 'bg-[var(--color_primary_light)] text-white'
                        : 'bg-[var(--color_bg_card_hover)] text-white'
                    } rounded-2xl px-4 py-2`}
                  >
                    {showSender && !isCurrentUser && (
                      <div className="text-xs text-[var(--color_text_muted)] mb-1">
                        {message.sender.fullName || 'Без имени'}
                      </div>
                    )}
                    <div className="text-sm break-words">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-white/70' : 'text-[var(--color_text_muted)]'
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--color_border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            disabled={sending}
            className="flex-1 bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 rounded-xl bg-[var(--color_primary_light)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
