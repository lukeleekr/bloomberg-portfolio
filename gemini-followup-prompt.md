# Gemini Follow-Up — Missing Sections & Polish

Copy everything below the line and paste into Gemini as a follow-up to the previous conversation.

---

Great work on the initial Bloomberg Terminal portfolio. I've implemented your code and added the missing sections. Now I need your design expertise to make these additional sections look as authentic as possible.

Please provide the complete code for these improvements, keeping the EXACT same Bloomberg Terminal design rules (black bg, orange accent, sharp corners, monospace, dense layout, no rounded anything):

## 1. Improve the Toolbox Section

Current: simple 2x3 grid with text. Make it look more like a Bloomberg function key panel. Ideas:
- Each tool should look like a Bloomberg keyboard function key
- Add keyboard shortcut styling (like `<F1>` labels)
- Claude Code card should have a special highlight (maybe orange left border or background tint)
- Add a small usage indicator or "DAILY USE" / "WEEKLY" / "EXPERIMENTAL" status tag for each tool

## 2. Add a "System Status" Widget

Like Bloomberg's system status panel. A small dense panel showing:
```
SYSTEM STATUS                    ● ONLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment    M3 Ultra (96GB RAM)
OS             macOS
Shell          zsh
AI Runtime     Claude Code v1.x
Models         Claude Opus / GPT-5.4
Uptime         Since 2026.01
Last Deploy    2026.04.04
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
With a green pulsing dot for ONLINE. Numbers in white, labels in gray.

## 3. Add Data Flicker Effect

Bloomberg terminals have constantly updating numbers that briefly flash when they change. Add a subtle effect:
- Every 5-8 seconds, randomly pick 2-3 numbers on the page
- Briefly flash them with higher brightness (opacity 1 → 0.5 → 1 over 300ms)
- This gives the impression of "live data" updating

## 4. Improve the Learning Journey

Current: basic boxes with arrows. Make it look like a Bloomberg timeline/chart:
- Use a horizontal bar that fills from left to right (like a progress bar)
- Mark milestones as vertical ticks on the bar
- Below each tick: year and description
- The bar should be orange up to the current position, gray for future
- Animate the bar filling on scroll

## 5. Add a "Bloomberg Message" Popup

Like the occasional Bloomberg message/alert that appears:
- Show a small popup in the bottom-right after 5 seconds on the page
- Style like a Bloomberg alert: orange border, black background
- Content: "Press / to open terminal" 
- Auto-dismiss after 5 seconds, or click to dismiss
- Only show once per session (use sessionStorage)

## 6. Improve Mobile Responsiveness

The current layout uses `md:grid-cols-12` which might not work well on mobile. Please provide:
- A mobile-optimized version where all panels stack vertically
- The tab bar should scroll horizontally on mobile
- The title bar should collapse the function buttons on small screens
- The footer ticker should still work on mobile
- All table data should have horizontal scroll on small screens

## 7. Add Keyboard Navigation

Like a real Bloomberg terminal:
- Arrow keys scroll between sections
- Number keys (1-9) jump to the corresponding tab section
- This makes the page feel like an actual terminal

Please provide the complete updated code for page.tsx with all these improvements integrated. Also provide any new CSS needed for globals.css.

Remember: SHARP CORNERS, MONOSPACE, BLACK BACKGROUND, ORANGE ACCENT. No modern web patterns.
