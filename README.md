# Slate Note-Taking App

A modern, clean note-taking application built with Next.js and TypeScript.

## Features

- **Plain Text Editing**: Simple, distraction-free text editor
- **Smart Lists**: Intelligent ordered and unordered list detection with auto-continuation
- **Auto-save**: Automatically saves your notes as you type
- **Modern UI**: Clean and responsive design
- **Undo/Redo**: Full history support with keyboard shortcuts

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
- **Unindent**: Press `Shift+Tab` to reduce indentation
- **Smart Backspace**: Press `Backspace` in indented areas to remove entire indent levels
- **End List**: Press `Enter` on an empty list item to end the list

#### Examples
```
1. First item
2. Second item
    - Nested bullet
    - Another nested item
3. Third item

- Bullet point
- Another bullet
    1. Nested numbered item
    2. Another nested number
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build

```bash
npm run build
```

This project uses TypeScript for type safety and Next.js for the React framework.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.