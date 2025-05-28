# Slate Note-Taking App

A modern, clean note-taking application built with Next.js and TypeScript.

## Features

- **Rich Text Editing**: Support for bold and italic formatting with keyboard shortcuts
- **Auto-save**: Automatically saves your notes as you type
- **Modern UI**: Clean and responsive design
- **Markdown Support**: Basic markdown formatting for bold (`**text**`) and italic (`*text*`)

## Recent Bug Fixes

### Bold and Italic Formatting Issues Fixed ✅

The following bugs in bold and italic formatting have been resolved:

1. **Deprecated `document.execCommand` replaced**: 
   - Old implementation used deprecated `document.execCommand("bold")` and `document.execCommand("italic")`
   - New implementation uses modern Selection API and DOM manipulation for better cross-browser compatibility

2. **Improved italic regex pattern**:
   - Fixed regex pattern that could fail to properly detect italic markdown syntax
   - Improved pattern now correctly handles edge cases and avoids conflicts with bold formatting

3. **Content initialization bug fixed**:
   - Fixed issue where contentEditable element wasn't properly initialized with formatted content on first render
   - Added proper initialization effect to ensure content loads correctly

4. **Better format toggle functionality**:
   - Added smart toggle functionality that detects existing formatting and removes/applies accordingly
   - Improved selection handling for both text selection and cursor positioning

## Usage

### Keyboard Shortcuts

- **Bold**: `Ctrl+B` (Windows/Linux) or `Cmd+B` (Mac)
- **Italic**: `Ctrl+I` (Windows/Linux) or `Cmd+I` (Mac)
- **Save**: `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)
- **Undo**: `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (Mac)
- **Redo**: `Ctrl+Y` (Windows/Linux) or `Cmd+Y` (Mac)

### Markdown Syntax

- **Bold**: `**your text**` will render as **your text**
- **Italic**: `*your text*` will render as *your text*
- **Bullet points**: `• item` will render as a bulleted list
- **Numbered lists**: `1. item` will render as a numbered list

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing Bold and Italic

To test the fixed bold and italic functionality:

1. Create a new note
2. Type some text and select it
3. Press `Ctrl+B` (or `Cmd+B`) to make it bold
4. Press `Ctrl+I` (or `Cmd+I`) to make it italic
5. Press the same shortcuts again to toggle formatting off
6. Try typing `**bold text**` and `*italic text*` to test markdown conversion

The formatting should now work reliably across all modern browsers.

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
