"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { TracePanel } from "@/components/trace/TracePanel";
import { useBazaarChat } from "@/lib/useBazaarChat";

export default function Home() {
  const { state, sendMessage } = useBazaarChat();

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden bg-paper md:grid-cols-[minmax(0,1fr)_360px]">
      <ChatPanel
        messages={state.messages}
        trace={state.trace}
        cart={state.cart}
        thinking={state.thinking}
        error={state.error}
        onSend={sendMessage}
      />
      <TracePanel trace={state.trace} messages={state.messages} thinking={state.thinking} />
    </div>
  );
}
