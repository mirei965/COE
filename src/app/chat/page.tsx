'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Send, AlertTriangle, Loader2, User, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/layout/PageLayout';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは。何かお困りですか？体調のこと、記録のことなど、お気軽にご相談ください。\n※医学的な診断はできません。会話の内容は記録の参考としてお使いください。',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error('Chat Error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。現在AI応答を利用できません。\n(APIキーの設定などを確認してください)',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="AI アシスタント" headerActions={<ThemeToggle />}>
      <div className="max-w-3xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-4">

        {/* Disclaimer Alert */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex items-start gap-3 shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold mb-1">【重要】利用上の注意</p>
            <p className="leading-relaxed">
              このチャット機能は医学的な診断、治療、助言を行うものではありません。
              具体的な症状や薬の調整については、必ず担当の医師や専門家にご相談ください。
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full gap-3",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl p-3.5 text-sm shadow-sm overflow-hidden",
                    "prose prose-sm max-w-none break-words",
                    msg.role === 'user'
                      ? "bg-brand-500 text-white rounded-br-sm prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white prose-code:text-white prose-a:text-white/90"
                      : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-sm text-slate-800 dark:text-slate-200 dark:prose-invert prose-slate prose-p:leading-relaxed prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:p-2 prose-pre:rounded-lg"
                  )}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full gap-3 justify-start animate-pulse">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AIが考え中...
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </CardContent>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                placeholder="メッセージを入力..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 dark:bg-slate-800"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="sm"
                className="shrink-0 w-10 h-10 p-0 rounded-md bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </PageLayout>
  );
}
