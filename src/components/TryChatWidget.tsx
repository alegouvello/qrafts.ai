import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TryChatWidget = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Pre-scripted demo responses
  const getDemoResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("improve") || lowerMessage.includes("answer")) {
      return t('landing.tryChat.responses.improve');
    } else if (lowerMessage.includes("interview") || lowerMessage.includes("prepare")) {
      return t('landing.tryChat.responses.interview');
    } else if (lowerMessage.includes("resume") || lowerMessage.includes("cv")) {
      return t('landing.tryChat.responses.resume');
    } else if (lowerMessage.includes("job") || lowerMessage.includes("role") || lowerMessage.includes("position")) {
      return t('landing.tryChat.responses.jobFit');
    } else if (lowerMessage.includes("track") || lowerMessage.includes("organize")) {
      return t('landing.tryChat.responses.organize');
    } else {
      return t('landing.tryChat.responses.default');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    
    // Simulate typing
    setIsTyping(true);
    
    // Simulate response delay
    setTimeout(() => {
      const response = getDemoResponse(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 pt-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('landing.tryChat.placeholder')}
          className="flex-1"
          disabled={isTyping}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        {t('landing.tryChat.disclaimer')}
      </p>
    </Card>
  );
};

export default TryChatWidget;
