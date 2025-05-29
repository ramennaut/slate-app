# OpenAI API Setup

To enable AI-powered atomic note generation, you need to configure your OpenAI API key.

## Setup Instructions

1. **Get your OpenAI API key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key or copy an existing one

2. **Create environment file**:
   - Create a file named `.env.local` in the project root
   - Add your API key:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **Restart the development server**:
   ```bash
   npm run dev
   ```

## Features Enabled

With the OpenAI API key configured, you'll get:

- **Intelligent Atomic Note Generation**: AI analyzes your content and creates meaningful atomic notes, each containing exactly one big idea
- **Better Content Understanding**: The AI understands context and creates self-contained notes
- **Automatic Fallback**: If the API is unavailable, it falls back to the original regex-based splitting

## Cost Information

- Uses GPT-4o-mini model (cost-effective)
- Typical cost: ~$0.001-0.005 per atomic note generation
- Only charges when you click "Create Atomic Notes"

## Privacy

- Your notes are sent to OpenAI for processing
- OpenAI's data usage policy applies
- Consider this when working with sensitive content 