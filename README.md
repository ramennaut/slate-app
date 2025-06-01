# Slate Notes

**A thinking OS that turns your ideas into structured notes.**

Built with Next.js and TypeScript, Slate Notes transforms the way you capture, organize, and develop your thoughts through intelligent note-taking and AI-powered atomic note generation.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Smart Lists](#smart-lists)
- [AI-Powered Features](#ai-powered-features)
  - [OpenAI Setup](#openai-setup)
- [Development](#development)
- [Deployment](#deployment)

## Features

- **Intelligent Text Processing**: Transform raw thoughts into structured, meaningful content
- **Smart Lists**: Intelligent ordered and unordered list detection with auto-continuation
- **AI-Powered Atomic Notes**: Generate meaningful, self-contained notes using OpenAI's GPT-4o-mini
- **Seamless Auto-save**: Automatically preserves your thoughts as you develop them
- **Clean, Distraction-Free Interface**: Focus on your ideas, not the interface
- **Full History Support**: Complete undo/redo functionality with keyboard shortcuts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

### Keyboard Shortcuts

- **Save**: `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)
- **Undo**: `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (Mac)
- **Redo**: `Ctrl+Y` (Windows/Linux) or `Cmd+Y` (Mac)

### Smart Lists

#### Creating Lists
- **Ordered Lists**: Start a line with `1. ` to begin a numbered list
- **Unordered Lists**: Start a line with `- `, `* `, or `• ` to begin a bullet list

#### List Navigation
- **Continue List**: Press `Enter` to automatically create the next list item
- **Indent**: Press `Tab` to indent the current list item (4 spaces)
- **Nested Numbering**: Ordered lists reset to 1 when indented to a new level
- **Unindent**: Press `Shift+Tab` to reduce indentation
- **Smart Backspace**: Press `Backspace` in indented areas to remove entire indent levels
- **End List**: Press `Enter` on an empty list item to end the list

#### Examples
```
1. First item
2. Second item
    1. Nested item (resets to 1)
    2. Another nested item
3. Third item

- Bullet point
- Another bullet
    1. Nested numbered item (starts at 1)
    2. Another nested number
- Back to bullets
```

## AI-Powered Features

### OpenAI Setup

To enable AI-powered atomic note generation, you need to configure your OpenAI API key.

#### Setup Instructions

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

#### Features Enabled

With the OpenAI API key configured, you'll get:

- **Intelligent Atomic Note Generation**: AI analyzes your content and creates meaningful atomic notes, each containing exactly one big idea
- **Better Content Understanding**: The AI understands context and creates self-contained notes
- **Automatic Fallback**: If the API is unavailable, it falls back to the original regex-based splitting

#### Cost Information

- Uses GPT-4o-mini model (cost-effective)
- Typical cost: ~$0.001-0.005 per atomic note generation
- Only charges when you click "Create Atomic Notes"

#### Privacy Notice

- Your notes are sent to OpenAI for processing
- OpenAI's data usage policy applies
- Consider this when working with sensitive content

## Development

### Build

```bash
npm run build
```

This project uses TypeScript for type safety and Next.js for the React framework.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.