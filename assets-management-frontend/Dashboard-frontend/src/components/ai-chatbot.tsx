"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Bot,
  LoaderCircle,
  MessageCircleMore,
  SendHorizontal,
  Sparkles,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatApiResponse = {
  error?: string;
  text?: string;
};

const STARTER_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Сайн байна уу. Би AssetHub-ийн AI туслах. Хөрөнгө, QR, тайлан, dashboard ашиглалтын талаар асуугаарай.",
  },
];

export function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const submitMessage = () => {
    const message = input.trim();
    if (!message || isPending) return;

    setError(null);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);

    const history = messages.filter(
      (item) => item.role !== "assistant" || item !== STARTER_MESSAGES[0]
    );

    startTransition(async () => {
      try {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            history,
          }),
        });

        const data: ChatApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "AI chatbot алдаа гарлаа.");
        }

        setMessages((current) => [
          ...current,
          { role: "assistant", content: data.text ?? "Хариу ирсэнгүй." },
        ]);
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : "Chatbot ажиллуулахад алдаа гарлаа.";
        setError(messageText);
      }
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon-lg"
          className="fixed right-6 bottom-6 z-40 rounded-full shadow-lg"
          aria-label="Open AI chatbot"
        >
          <MessageCircleMore />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[min(100vw,420px)] gap-0 p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div>
              <SheetTitle>AI Assistant</SheetTitle>
              <SheetDescription>Gemini 2.5 Flash дээр ажиллана.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.content}
                </div>

                {message.role === "user" && (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            ))}

            {isPending && (
              <div className="flex gap-3">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="size-4" />
                </div>
                <div className="flex items-center gap-2 rounded-3xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Хариулт боловсруулж байна...
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t bg-background p-4">
            <div className="rounded-3xl border bg-background p-2 shadow-sm">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Асуултаа бичнэ үү..."
                className="min-h-24 resize-none border-0 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between px-1 pt-2">
                <p className="text-xs text-muted-foreground">
                  `Enter` илгээнэ, `Shift + Enter` мөр шилжинэ.
                </p>
                <Button type="submit" disabled={!input.trim() || isPending}>
                  <SendHorizontal />
                  Илгээх
                </Button>
              </div>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
