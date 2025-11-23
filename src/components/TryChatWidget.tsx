import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { Link } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TryChatWidget = () => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_DEMO_MESSAGES = 5;
  const isLimitReached = messageCount >= MAX_DEMO_MESSAGES;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    setIsTyping(true);
    setError(null);

    try {
      // Handle streaming response
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages,
              { role: "user", content: userMessage }
            ],
            language: i18n.language
          }),
        }
      );

      // Check for rate limiting
      if (response.status === 429) {
        const errorData = await response.json();
        const waitMinutes = errorData.resetTime 
          ? Math.ceil((new Date(errorData.resetTime).getTime() - Date.now()) / (60 * 1000))
          : 60;
        
        setError(`Rate limit exceeded. Please try again in ${waitMinutes} minutes.`);
        setIsTyping(false);
        setMessages(prev => prev.filter(msg => msg.content !== ""));
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('Failed to get streaming response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsTyping(false);
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      setIsTyping(false);
    } catch (err) {
      console.error('Error streaming chat:', err);
      setError('Something went wrong. Please try again.');
      setIsTyping(false);
      
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(msg => msg.content !== ""));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || isLimitReached) return;

    const userMessage = input.trim();
    setInput("");
    
    // Increment message count
    setMessageCount(prev => prev + 1);
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    
    // Stream AI response
    await streamChat(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleQuestions = [
    t('landing.tryChat.examples.improve'),
    t('landing.tryChat.examples.interview'),
    t('landing.tryChat.examples.track')
  ];

  const handleExampleClick = (question: string) => {
    if (isLimitReached) return;
    setInput(question);
  };

  return (
    <Card className="max-w-2xl mx-auto p-6 space-y-4 bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-lg">{t('landing.tryChat.title')}</h4>
          <p className="text-sm text-muted-foreground">{t('landing.tryChat.subtitle')}</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="min-h-[300px] max-h-[400px] overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center py-8">
              {t('landing.tryChat.prompt')}
            </p>
            <div className="grid gap-2">
              {exampleQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="text-left justify-start h-auto py-3 px-4 whitespace-normal"
                  onClick={() => handleExampleClick(question)}
                  disabled={isTyping || isLimitReached}
                >
                  <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{question}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t('landing.tryChat.typing')}</span>
                </div>
              </div>
            )}
            {isLimitReached && (
              <div className="flex justify-center animate-fade-in-up">
                <Card className="bg-primary/5 border-primary/20 p-4 max-w-md">
                  <div className="text-center space-y-3">
                    <Sparkles className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">{t('landing.tryChat.limitReached.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('landing.tryChat.limitReached.message')}</p>
                    <Link to="/auth">
                      <Button size="sm" className="mt-2">
                        {t('landing.tryChat.limitReached.button')}
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="text-center py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 pt-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isLimitReached ? t('landing.tryChat.limitReached.inputPlaceholder') : t('landing.tryChat.placeholder')}
          className="flex-1"
          disabled={isTyping || isLimitReached}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isTyping || isLimitReached}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {!isLimitReached && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          {t('landing.tryChat.disclaimer')} ({messageCount}/{MAX_DEMO_MESSAGES} {t('landing.tryChat.messagesUsed')})
        </p>
      )}
    </Card>
  );
};

export default TryChatWidget;
