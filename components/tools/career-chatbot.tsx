'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { scheduleAnchorAboveKeyboard } from '@/hooks/use-mobile-composer-viewport'
import { Send, Sparkles, Bot, User, Loader2, AlertCircle, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

type Message = {
  role: 'user' | 'model'
  text: string
}

function ChatbotMessageRenderer({ content }: { content: string }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  const parseAsterisks = (text: string): React.ReactNode => {
    const parts = text.split(/(\*.*?\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        const inner = part.slice(1, -1)
        return <span key={idx} className="text-[15px] font-semibold text-foreground/90">{inner}</span>
      }
      return part
    })
  }

  const parseInlineStyles = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2)
        return <strong key={idx} className="font-bold text-foreground">{parseAsterisks(inner)}</strong>
      }
      return <span key={idx}>{parseAsterisks(part)}</span>
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line) {
      elements.push(<div key={`br-${i}`} className="h-2" />)
      continue
    }

    // 1) Heading: "### text" or "### text ###"
    const headingMatch = line.match(/^###\s+(.*?)(?:\s+###)?$/)
    if (headingMatch) {
      elements.push(
        <h3 key={`h-${i}`} className="text-base font-extrabold text-foreground mt-3 mb-1.5">
          {parseInlineStyles(headingMatch[1])}
        </h3>
      )
      continue
    }

    // 2) Categorization by numbers: "4. " or any "1. "
    const numberMatch = line.match(/^(\d+\.\s+)(.*)$/)
    if (numberMatch) {
      elements.push(
        <div key={`num-${i}`} className="pl-1.5 my-1.5 text-sm text-foreground">
          <span className="font-bold mr-1">{numberMatch[1]}</span>
          {parseInlineStyles(numberMatch[2])}
        </div>
      )
      continue
    }

    // 3) Bullet points / sub-sub-headings starting with * or -
    if (line.startsWith('*') || line.startsWith('-')) {
      const contentText = line.replace(/^[\*\-]\s*/, '')
      elements.push(
        <div key={`li-${i}`} className="pl-3 flex items-start gap-1.5 text-[15px] font-medium leading-relaxed my-1">
          <span className="shrink-0 text-muted-foreground">•</span>
          <span className="flex-1">{parseInlineStyles(contentText)}</span>
        </div>
      )
      continue
    }

    // 4) Plain text paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm text-foreground/90 leading-relaxed mb-1.5">
        {parseInlineStyles(line)}
      </p>
    )
  }

  return <div className="space-y-1">{elements}</div>
}

export function CareerChatbot() {
  const { t, locale } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKeyError, setApiKeyError] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)

  const toggleChatCollapsed = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) return
    setChatCollapsed((prev) => !prev)
  }
  
  const cardRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const wasLoadingRef = useRef(false)

  const scrollChatbotAboveKeyboard = useCallback(() => {
    scheduleAnchorAboveKeyboard(cardRef.current, messagesScrollRef.current)
  }, [])

  const handleInputFocus = () => {
    scrollChatbotAboveKeyboard()
  }

  // Only after AI finishes responding — not on every render or while typing on the page
  useEffect(() => {
    if (wasLoadingRef.current && !loading && messages.length > 0) {
      scrollChatbotAboveKeyboard()
    }
    wasLoadingRef.current = loading
  }, [loading, messages.length, scrollChatbotAboveKeyboard])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return

    const userMessage: Message = { role: 'user', text: textToSend }
    const updatedMessages = [...messages, userMessage]
    
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setApiKeyError(false)

    try {
      const res = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      })

      const data = await res.json()

      if (data.error === 'missing_api_key') {
        setApiKeyError(true)
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.text || t.skillImprovement.chatbotApiKeyWarning,
          },
        ])
      } else if (!res.ok || data.error) {
        const errorText = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || t.tools.failedToGenerate)
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: errorText,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.text,
          },
        ])
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: t.tools.networkError,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setApiKeyError(false)
  }

  // Quick suggestions depending on active language
  const quickSuggestions = [
    locale === 'ru'
      ? 'Как стать Frontend разработчиком?'
      : locale === 'kk'
      ? 'Frontend әзірлеушісі қалай болуға болады?'
      : 'How to become a Frontend developer?',
    locale === 'ru'
      ? 'Какие навыки нужны для DevOps?'
      : locale === 'kk'
      ? 'DevOps үшін қандай дағдылар қажет?'
      : 'What skills are needed for DevOps?',
    locale === 'ru'
      ? 'Как вырасти от Junior до Senior?'
      : locale === 'kk'
      ? 'Junior-ден Senior-ге қалай өсуге болады?'
      : 'How to grow from Junior to Senior?',
  ]

  return (
    <Card
      ref={cardRef}
      id="career-chatbot"
      className={cn(
        "flex flex-col h-full border-border/70 shadow-sm overflow-hidden bg-card max-md:scroll-mt-4",
        !chatCollapsed && "max-md:h-[800px] max-md:min-h-[800px] max-md:max-h-[800px]",
      )}
    >
      <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 space-y-0.5 text-left lg:cursor-default"
          onClick={toggleChatCollapsed}
          aria-expanded={!chatCollapsed}
          aria-controls="career-chatbot-body"
        >
          <CardTitle className="text-md font-bold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-primary animate-pulse" />
            <span className="truncate">{t.skillImprovement.chatbotTitle}</span>
            <ChevronDown
              className={cn(
                "ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform lg:hidden",
                chatCollapsed && "-rotate-90",
              )}
              aria-hidden
            />
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground line-clamp-1">
            {t.skillImprovement.chatbotSubtitle}
          </CardDescription>
        </button>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleClear}
            title={t.tools.clearChat}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <div
        id="career-chatbot-body"
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          chatCollapsed ? "hidden lg:flex" : "flex",
        )}
      >
      <CardContent
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 min-h-[200px] flex flex-col scroll-pb-4"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="max-w-[240px] space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t.skillImprovement.chatbotTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.skillImprovement.chatbotEmpty}
              </p>
            </div>
            <div className="w-full max-w-xs space-y-2 pt-2">
              {quickSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(suggestion)}
                  className="w-full text-left text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg p-2.5 transition-colors border border-border/40 font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm max-w-[85%] whitespace-pre-wrap ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-muted text-foreground border border-border/40 rounded-tl-none'
                    }`}
                  >
                    {isUser ? (
                      msg.text
                    ) : (
                      <ChatbotMessageRenderer content={msg.text} />
                    )}
                  </div>
                  {isUser && (
                    <div className="h-7 w-7 rounded-full bg-muted border border-border/60 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )
            })}
            
            {loading && (
              <div className="flex items-start gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted text-muted-foreground border border-border/40 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-sm shadow-sm flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t.tools.thinking}</span>
                </div>
              </div>
            )}
            
            {apiKeyError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Configuration Needed</span>
                  Please check your <code>.env</code> file. Add the environment variable:
                  <code className="block bg-destructive/20 rounded px-1.5 py-1 mt-1 font-mono text-[10px] select-all">
                    GEMINI_API_KEY="your_api_key"
                  </code>
                </div>
              </div>
            )}
            
          </div>
        )}
      </CardContent>

      <div className="shrink-0 p-3 border-t border-border/60 bg-muted/30">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(input)
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={t.skillImprovement.chatbotPlaceholder}
            disabled={loading}
            enterKeyHint="send"
            className="flex-1 bg-background border border-border/70 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      </div>
    </Card>
  )
}
