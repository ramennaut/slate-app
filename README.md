# Slate Notes

**A thinking OS that turns your ideas into structured notes.**

Slate is a minimal, AI-powered note system built with Next.js and TypeScript. It helps you break down long-form writing into atomic notes, link them semantically, and assemble structured insights — all in a focused, text-first environment.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Smart Lists](#smart-lists)
- [AI Features](#ai-features)
  - [OpenAI Setup](#openai-setup)
- [Development](#development)
- [Deployment](#deployment)

## Features

- **AI-Powered Atomic Note Generation**: Break down dense text into self-contained, single-idea notes
- **Semantic Linking**: Auto-link related notes by meaning, not just keywords or tags
- **Smart Lists**: Intelligent bullet/numbered list creation and editing
- **Seamless Auto-Save**: Your writing is always preserved in real time
- **Minimal, Distraction-Free Interface**: Clean UI designed for deep thinking
- **Full Undo/Redo Support**: Navigate your writing history with keyboard shortcuts

## Getting Started

```bash
npm install
npm run dev
````

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Keyboard Shortcuts

#### Basic Editing
* **Save**: `Ctrl+S` / `Cmd+S`
* **Undo**: `Ctrl+Z` / `Cmd+Z`
* **Redo**: `Ctrl+Y` / `Cmd+Y` or `Ctrl+Shift+Z` / `Cmd+Shift+Z`

#### Search & Navigation
* **Open Search**: `Ctrl+K` / `Cmd+K` (when atomic notes exist)
* **Close Search/Dialogs**: `Escape`

#### Note Management
* **Multi-Select Notes**: `Ctrl+Click` / `Cmd+Click` (toggle selection)
* **Range Select Notes**: `Shift+Click` (select range)
* **Delete Selected Notes**: `Ctrl+Delete` / `Cmd+Delete` or `Shift+Delete` / `Shift+Backspace`
* **Clear Selection**: `Escape`

#### Smart Editing
* **Continue Lists**: `Enter` (automatically continues numbered/bullet lists)
* **End Lists**: `Enter` on empty list item
* **Indent**: `Tab` (adds 4 spaces or indents list items)
* **Unindent**: `Shift+Tab` (removes indentation or unindents list items)
* **Smart Backspace**: `Backspace` (removes entire indent levels when in whitespace)

#### Context Actions
* **Define Term**: Right-click on selected text → "Define"

### Smart Lists

Create structured bullet or numbered lists quickly:

* **Ordered List**: `1. Item` → `Enter` continues numbering
* **Unordered List**: `- Item`, `* Item`, or `• Item` → `Enter` continues bullets
* **Indent**: `Tab`
* **Unindent**: `Shift+Tab`
* **Smart End**: `Enter` on an empty item exits the list

Example:

```
1. First item
2. Second item
    1. Nested item
    2. Another nested item
3. Back to top level

- Bullet point
- Another bullet
    1. Nested numbered
    2. Another one
```

## AI Features

### OpenAI Setup

To enable atomic note generation, you'll need your own OpenAI API key.

#### Steps

1. Get your API key from: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a `.env.local` file in the project root:

   ```
   NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
   ```
3. Restart the development server:

   ```bash
   npm run dev
   ```

#### Features Enabled

* AI-based note splitting using GPT-4o-mini
* Notes are parsed into self-contained atomic chunks
* Falls back to regex-based splitting if AI is unavailable

#### Cost Info

* Uses GPT-4o-mini (low-cost)
* Cost per generation: \~\$0.001–0.005
* Only charges when you explicitly use the AI

#### Privacy Notice

* Content is sent to OpenAI for processing
* Subject to OpenAI's data usage policy
* Use caution with sensitive content

## Development

### Build

```bash
npm run build
```

Slate is built with:

* **Next.js** for SSR and routing
* **TypeScript** for static typing
* **OpenAI API** for language understanding

## Deployment

Deploy easily via [Vercel](https://vercel.com/import/project?template=next.js) — the official platform for Next.js apps.

For alternatives, see the [Next.js deployment guide](https://nextjs.org/docs/app/building-your-application/deploying).
