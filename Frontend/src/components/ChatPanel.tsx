import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { useRoom } from '@/contexts/RoomContext';

const ChatPanel: React.FC = () => {
  const { room, currentUser, sendMessage } = useRoom();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage(message);
    setMessage('');
  };

  if (!room) return null;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="glass rounded-2xl flex flex-col h-[400px] lg:h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {room.messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-slide-up ${
              msg.type === 'system' ? 'text-center' : ''
            }`}
          >
            {msg.type === 'system' ? (
              <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {msg.content}
              </span>
            ) : (
              <div
                className={`flex gap-2 ${
                  msg.userId === currentUser?.id ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    msg.userId === currentUser?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } rounded-2xl px-4 py-2`}
                >
                  {msg.userId !== currentUser?.id && (
                    <span className="text-xs font-medium text-primary block mb-1">
                      {msg.userName}
                    </span>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <span
                    className={`text-xs ${
                      msg.userId === currentUser?.id
                        ? 'text-primary-foreground/60'
                        : 'text-muted-foreground'
                    } block text-right mt-1`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-muted/50 border-border/50 focus:border-primary"
          />
          <Button
            type="submit"
            variant="glow"
            size="icon"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
