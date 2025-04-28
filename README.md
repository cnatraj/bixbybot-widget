# BixbyBot Chat Widget

## Overview

The BixbyBot Chat Widget is a customizable chat widget designed to be easily embedded into third-party websites. It allows website visitors to interact with a chat interface, with messages stored and managed using Supabase.

## Features

- **Easy Integration:** Embeddable via a single `<script>` tag
- **Customizable:** The widget's appearance can be customized via a configuration object
- **Supabase Integration:** Uses Supabase for storing and retrieving chat messages
- **Real-time Communication:** Supports real-time messaging between users and bots
- **Chat History:** Persists chat history using Supabase
- **Clear Chat Functionality:** Allows users to clear their chat history using the 'clr' command
- **Error Handling:** Comprehensive error handling with user-friendly messages
- **Responsive Design:** Works seamlessly on both desktop and mobile devices

## Getting Started

### Prerequisites

- A Supabase project with the required database schema
- A Netlify account for hosting the widget
- Node.js and npm installed locally for development

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bixbybot-widget
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Usage

Add the widget to your website by including the following script tag:

```html
<script type="module" src="https://your-widget-url.netlify.app/bixby-widget.js" data-client-id="your-client-id"></script>
```

Replace `your-widget-url.netlify.app` with your actual Netlify deployment URL and `your-client-id` with the client identifier.

## Database Schema

The widget requires the following Supabase tables:

### Clients Table
```sql
CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
```

### Widget Configurations Table
```sql
CREATE TABLE public.widget_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    theme jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (client_id)
);

ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;
```

### Widget Conversations Table
```sql
CREATE TABLE public.widget_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text,
    thread_id text NOT NULL,
    sender text NOT NULL,
    message text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT widget_conversations_sender_check CHECK ((sender = ANY (ARRAY['user'::text, 'bot'::text])))
);

CREATE INDEX idx_widget_conversations_client_id ON public.widget_conversations USING btree (client_id);
CREATE INDEX idx_widget_conversations_thread_id ON public.widget_conversations USING btree (thread_id);

ALTER TABLE public.widget_conversations ENABLE ROW LEVEL SECURITY;
```

## Configuration Options

### Theme Configuration

```javascript
{
  position: {
    bottom: '20px',
    right: '20px'
  },
  button: {
    size: '60px',
    backgroundColor: '#1867C0',
    iconColor: 'white',
    hoverColor: '#1557A0'
  },
  window: {
    width: '350px',
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '12px'
  },
  header: {
    backgroundColor: '#1867C0',
    textColor: 'white'
  },
  messages: {
    userBackground: '#1867C0',
    userText: 'white',
    botBackground: '#f0f0f0',
    botText: '#333'
  },
  input: {
    borderColor: '#ddd'
  }
}
```

### Settings Configuration

```javascript
{
  inputPlaceholder: 'Type your message...',
  sendButtonText: 'Send'
}
```

## Development

### Project Structure

```
bixbybot-widget/
├── src/
│   └── widget.js       # Main widget implementation
├── .env               # Environment variables
├── index.html         # Development test page
├── package.json       # Project dependencies
├── vite.config.js     # Vite configuration
└── netlify.toml       # Netlify deployment configuration
```

### Building

The project uses Vite for building. The build process:
1. Bundles the widget into a single IIFE
2. Minifies and optimizes the code
3. Generates source maps
4. Outputs to the `dist` directory

### Deployment

The widget is configured for deployment to Netlify:

1. Netlify automatically builds the project using the command specified in `netlify.toml`
2. The built files are served from the `dist` directory
3. CORS headers are automatically added to allow cross-origin requests

## Error Handling

The widget includes comprehensive error handling for:
- Supabase connection issues
- Message sending failures
- Chat history loading problems
- Configuration loading errors

All errors are logged to the console and displayed to users when appropriate.

## Commands

- `clr`: Clears the chat history and starts a new conversation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.