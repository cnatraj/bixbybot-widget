class BixbyWidget {
  constructor() {
    this.botId = this.getBotId();
    if (!this.botId) {
      console.error(
        "BixbyWidget: No bot ID provided. Add data-bot-id attribute to the script tag."
      );
      return;
    }
    this.config = null;
    // this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.supabaseUrl = "https://kmztjgixkokzhnxczhpk.supabase.co";
    // this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.supabaseAnonKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttenRqZ2l4a29remhueGN6aHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2OTkxNjgsImV4cCI6MjA2MDI3NTE2OH0.7mXw_J1BFSxAEfkUP9O_tBe7mMp68oih4sMSgZm3z7A";
    this.supabase = null;
    this.threadId = null;
    this.initialize();
  }

  getBotId() {
    const scripts = document.getElementsByTagName("script");
    const currentScript = scripts[scripts.length - 1];
    return currentScript?.getAttribute("data-bot-id");
  }

  async initialize() {
    try {
      // Validate Supabase configuration
      if (!this.supabaseUrl || !this.supabaseAnonKey) {
        throw new Error(
          "Missing Supabase configuration. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
        );
      }

      console.log("Initializing Supabase client with URL:", this.supabaseUrl);

      // Initialize Supabase client
      const { createClient } = await import("@supabase/supabase-js");
      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);

      await this.loadClientConfig();
      if (!this.config) {
        console.error("BixbyWidget: Failed to load configuration");
        return;
      }
      this.createStyles();
      this.createWidget();
      this.initializeEventListeners();
      await this.loadChatHistory();
      this.setupMobileHandling();
    } catch (error) {
      console.error("BixbyWidget: Initialization failed", error);
      this.showError(
        "Failed to initialize chat widget. Please check console for details."
      );
    }
  }

  setupMobileHandling() {
    if (!this.elements?.chatWindow) return;

    // Handle viewport changes on mobile
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener("resize", () => {
        if (this.elements.chatWindow.style.display !== "flex") return;

        const isMobile = window.innerWidth <= 768;
        if (!isMobile) return;

        // Adjust chat window size and position when keyboard appears
        const keyboardHeight = window.innerHeight - visualViewport.height;
        const chatHeight = visualViewport.height - 20;

        this.elements.chatWindow.style.height = `${chatHeight}px`;
        this.elements.chatWindow.style.bottom = "10px";
        this.elements.messages.style.height = `${chatHeight - 120}px`; // Account for header and input
      });
    }

    // Prevent scrolling of the parent page when interacting with the chat
    this.elements.chatWindow.addEventListener(
      "touchmove",
      (e) => {
        const target = e.target;
        const messagesContainer = this.elements.messages;

        if (
          target === messagesContainer ||
          messagesContainer.contains(target)
        ) {
          if (messagesContainer.scrollHeight > messagesContainer.clientHeight) {
            e.stopPropagation();
          } else {
            e.preventDefault();
          }
        } else {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  async loadClientConfig() {
    try {
      const response = await fetch(
        `${
          this.supabaseUrl
        }/functions/v1/get-widget-config?botId=${encodeURIComponent(
          this.botId
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.config = await response.json();

      if (!this.config) {
        throw new Error("No configuration received from server");
      }

      return this.config;
    } catch (error) {
      console.error("Error loading client configuration:", error);
      this.showError(
        "Failed to load widget configuration. Please check your bot ID."
      );
      return null;
    }
  }

  createStyles() {
    const theme = this.config?.config?.theme || {};
    const styles = `
      .bixby-widget {
        position: fixed;
        bottom: ${theme.position?.bottom || "20px"};
        right: ${theme.position?.right || "20px"};
        z-index: 9999;
        font-family: ${
          theme.font ||
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
        };
      }
      .bixby-widget-button {
        width: ${theme.button?.size || "60px"};
        height: ${theme.button?.size || "60px"};
        border-radius: 50%;
        background: ${theme.button?.backgroundColor || "#1867C0"};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
      }
      .bixby-widget-button:hover {
        transform: scale(1.05);
      }
      .bixby-widget-icon {
        width: 24px;
        height: 24px;
        fill: ${theme.button?.iconColor || "white"};
      }
      .bixby-chat-window {
        position: fixed;
        width: calc(100% - 20px);
        height: calc(100% - 20px);
        max-width: ${theme.window?.width || "350px"};
        max-height: ${theme.window?.height || "500px"};
        background: ${theme.window?.backgroundColor || "white"};
        border-radius: ${theme.window?.borderRadius || "12px"};
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
        display: none;
        flex-direction: column;
        overflow: hidden;
        bottom: 10px;
        right: 10px;
        transition: all 0.1s ease;
      }
      .bixby-chat-header {
        padding: 16px;
        background: ${theme.header?.backgroundColor || "#1867C0"};
        color: ${theme.header?.textColor || "white"};
        font-weight: 500;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .bixby-close-button {
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }
      .bixby-close-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .bixby-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      .bixby-chat-input {
        padding: 16px;
        border-top: 1px solid ${theme.input?.borderColor || "#eee"};
        display: flex;
        flex-shrink: 0;
        background: ${theme.window?.backgroundColor || "white"};
      }
      .bixby-chat-input input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid ${theme.input?.borderColor || "#ddd"};
        border-radius: 4px;
        margin-right: 8px;
        font-size: 16px;
        -webkit-appearance: none;
        appearance: none;
      }
      .bixby-chat-input button {
        padding: 8px 16px;
        background: ${theme.button?.backgroundColor || "#1867C0"};
        color: ${theme.button?.textColor || "white"};
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        -webkit-appearance: none;
        appearance: none;
      }
      .bixby-chat-input button:hover {
        background: ${theme.button?.hoverColor || "#1557A0"};
      }
      .bixby-typing-indicator {
        padding: 8px;
        color: #666;
        font-style: italic;
        display: none;
      }
      .bixby-error-message {
        color: #dc2626;
        padding: 8px;
        text-align: center;
        background: #fee2e2;
        border-radius: 4px;
        margin: 8px;
        display: none;
      }
      .bixby-system-message {
        text-align: center;
        color: #666;
        font-style: italic;
        margin: 8px 0;
        font-size: 12px;
      }
      @media (max-width: 768px) {
        .bixby-widget-button {
          width: 50px;
          height: 50px;
          bottom: 20px;
          right: 20px;
        }
        .bixby-chat-window {
          max-width: 100%;
          max-height: 100%;
        }
        .bixby-chat-input {
          padding: 12px;
        }
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  createWidget() {
    const widget = document.createElement("div");
    widget.className = "bixby-widget";

    const button = document.createElement("div");
    button.className = "bixby-widget-button";
    button.innerHTML = `
      <svg class="bixby-widget-icon" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    `;

    const chatWindow = document.createElement("div");
    chatWindow.className = "bixby-chat-window";
    chatWindow.innerHTML = `
      <div class="bixby-chat-header">
        <span>Chat with ${this.config?.bot?.name || "Bixby"}</span>
        <div class="bixby-close-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>
      <div class="bixby-chat-messages"></div>
      <div class="bixby-typing-indicator">Assistant is typing...</div>
      <div class="bixby-error-message"></div>
      <div class="bixby-chat-input">
        <input type="text" placeholder="${
          this.config?.config?.settings?.inputPlaceholder ||
          "Type your message..."
        } (Type 'clr' to clear chat)">
        <button>${
          this.config?.config?.settings?.sendButtonText || "Send"
        }</button>
      </div>
    `;

    widget.appendChild(button);
    widget.appendChild(chatWindow);
    document.body.appendChild(widget);

    this.elements = {
      widget,
      button,
      chatWindow,
      messages: chatWindow.querySelector(".bixby-chat-messages"),
      input: chatWindow.querySelector("input"),
      sendButton: chatWindow.querySelector("button"),
      typingIndicator: chatWindow.querySelector(".bixby-typing-indicator"),
      errorMessage: chatWindow.querySelector(".bixby-error-message"),
      closeButton: chatWindow.querySelector(".bixby-close-button"),
    };
  }

  showError(message) {
    if (this.elements?.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = "block";
    } else {
      console.error("BixbyWidget Error:", message);
    }
  }

  initializeEventListeners() {
    this.elements.button.addEventListener("click", () => {
      this.elements.chatWindow.style.display = "flex";
      this.elements.button.style.display = "none";
      this.elements.input.focus();
    });

    this.elements.closeButton.addEventListener("click", () => {
      this.elements.chatWindow.style.display = "none";
      this.elements.button.style.display = "flex";
    });

    this.elements.sendButton.addEventListener("click", () =>
      this.handleMessage()
    );
    this.elements.input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleMessage();
    });

    // Prevent zoom on input focus for iOS
    this.elements.input.addEventListener("focus", () => {
      // Add a slight delay to ensure the viewport is stable
      setTimeout(() => {
        this.elements.input.style.fontSize = "16px";
      }, 100);
    });
  }

  async loadChatHistory() {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      if (!this.threadId) {
        this.threadId = localStorage.getItem(`bixby_thread_${this.botId}`);
      }

      if (this.threadId) {
        console.log("Loading chat history for thread:", this.threadId);

        const { data: messages, error } = await this.supabase
          .from("widget_conversations")
          .select("*")
          .eq("thread_id", this.threadId)
          .order("created_at", { ascending: true });

        if (error) {
          throw new Error(`Supabase query error: ${error.message}`);
        }

        console.log("Loaded messages:", messages?.length || 0);

        messages?.forEach((message) => {
          this.addMessage(message.sender, message.message, false);
        });
      } else {
        console.log("No existing thread ID found");
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      this.showError(
        "Failed to load chat history. Please refresh the page to try again."
      );
    }
  }

  async saveMessage(sender, message) {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { error } = await this.supabase
        .from("widget_conversations")
        .insert({
          bot_id: this.botId,
          thread_id: this.threadId,
          sender,
          message,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving message:", error);
      this.showError("Failed to save message. Please try sending again.");
    }
  }

  clearChat() {
    this.elements.messages.innerHTML = "";
    localStorage.removeItem(`bixby_thread_${this.botId}`);
    this.threadId = null;

    const systemMessage = document.createElement("div");
    systemMessage.className = "bixby-system-message";
    systemMessage.textContent =
      "Chat history cleared. Starting new conversation...";
    this.elements.messages.appendChild(systemMessage);
  }

  async handleMessage() {
    const message = this.elements.input.value.trim();
    if (!message) return;

    if (message.toLowerCase() === "clr") {
      this.clearChat();
      this.elements.input.value = "";
      return;
    }

    this.addMessage("user", message);
    await this.saveMessage("user", message);

    this.elements.input.value = "";
    this.elements.typingIndicator.style.display = "block";
    this.elements.input.disabled = true;
    this.elements.sendButton.disabled = true;
    this.elements.errorMessage.style.display = "none";

    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          message,
          threadId: this.threadId,
          botId: this.botId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.threadId = data.threadId;
      localStorage.setItem(`bixby_thread_${this.botId}`, this.threadId);

      this.addMessage("bot", data.response);
      await this.saveMessage("bot", data.response);
    } catch (error) {
      console.error("Error sending message:", error);
      this.showError("Failed to send message. Please try again.");
    } finally {
      this.elements.typingIndicator.style.display = "none";
      this.elements.input.disabled = false;
      this.elements.sendButton.disabled = false;
      this.elements.input.focus();
    }
  }

  addMessage(sender, text, shouldSave = true) {
    const messageDiv = document.createElement("div");
    messageDiv.style.marginBottom = "12px";
    messageDiv.style.textAlign = sender === "user" ? "right" : "left";

    const bubble = document.createElement("div");
    bubble.style.display = "inline-block";
    bubble.style.padding = "8px 12px";
    bubble.style.borderRadius = "12px";
    bubble.style.maxWidth = "80%";
    bubble.style.wordBreak = "break-word";

    const theme = this.config?.config?.theme || {};
    if (sender === "user") {
      bubble.style.background = theme.messages?.userBackground || "#1867C0";
      bubble.style.color = theme.messages?.userText || "white";
    } else {
      bubble.style.background = theme.messages?.botBackground || "#f0f0f0";
      bubble.style.color = theme.messages?.botText || "#333";
    }

    bubble.textContent = text;
    messageDiv.appendChild(bubble);
    this.elements.messages.appendChild(messageDiv);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }
}

// Auto-initialize the widget when the script loads
new BixbyWidget();
