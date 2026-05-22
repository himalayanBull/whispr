# whispr

Anonymous hyperlocal chat. Connect with strangers within 10 km of you — no accounts, no history, no trace.

## What is whispr?

whispr is a real-time anonymous chat application that pairs you with nearby strangers based on your location, mood, and gender preferences. Conversations are ephemeral — once you disconnect, everything disappears. No messages are stored. No accounts exist.

### Core Features

- **Hyperlocal matching** — Only connects users within a 10 km radius using the Haversine formula for accurate great-circle distance calculation
- **Mood-based context** — Users select their current vibe (Walking, Bored, Studying, Late night thoughts, Coffee, Trekking) which is shared with their match
- **Gender preferences** — Filter matches by gender with bidirectional preference matching (both users must satisfy each other's preference)
- **Real-time messaging** — Instant message delivery via persistent WebSocket connections
- **Typing indicators** — See when your partner is typing, with automatic 2-second timeout
- **Late night mode** — UI adapts with a deeper, moodier color palette between 10 PM and 5 AM
- **Rate limiting** — 30 messages per 60-second window per user to prevent spam
- **Inactivity timeout** — Paired users are disconnected after 5 minutes of silence
- **Skip / Next** — Instantly find a new match without leaving the app
- **Report** — Flag inappropriate users (server-side logging)
- **Online count** — Live count of connected users broadcast to all clients

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────┐   │
│  │ Landing     │──▶│ Searching    │──▶│ Chat Screen            │   │
│  │ Screen      │   │ Screen       │   │  - Message list (last 4)│   │
│  │             │   │              │   │  - Typing indicator     │   │
│  │ - Location  │   │ - Animated   │   │  - Distance display     │   │
│  │   request   │   │   radar      │   │  - Partner mood         │   │
│  │ - Gender    │   │   pulse      │   │  - Next / Report / DC   │   │
│  │   selection │   │              │   │                          │   │
│  │ - Mood pick │   │              │   │                          │   │
│  └─────────────┘   └──────────────┘   └────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        Custom Hooks                           │   │
│  │  useSocket       useGeolocation       useTimeOfDay           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ WebSocket (socket.io-client)          │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Socket.IO)                     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Connection Handler                         │ │
│  │                                                                │ │
│  │  Events:                                                       │ │
│  │    find-match  → Register user, attempt match or enqueue       │ │
│  │    send-message → Rate-limit check, relay to partner           │ │
│  │    typing      → Forward typing state to partner               │ │
│  │    skip        → Disconnect partner, re-enter matching queue   │ │
│  │    leave       → Clean disconnect, remove from all state       │ │
│  │    report      → Log report, disconnect partner                │ │
│  │    disconnect  → Cleanup on socket close                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐    │
│  │   Matching Engine    │   │         In-Memory State           │    │
│  │                      │   │                                    │    │
│  │  - FIFO queue scan   │   │  users: Map<socketId, User>       │    │
│  │  - Distance filter   │   │  waitingQueue: string[]           │    │
│  │    (≤ 10 km)         │   │                                    │    │
│  │  - Bidirectional     │   │  Per-user:                         │    │
│  │    gender matching   │   │    - coordinates (lat/lng)         │    │
│  │  - Haversine formula │   │    - mood, gender, preference     │    │
│  │                      │   │    - partnerId                     │    │
│  └─────────────────────┘   │    - rate limit counters           │    │
│                             │    - lastActivity timestamp        │    │
│                             └──────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Periodic Inactivity Sweep (60s interval)          │ │
│  │  Disconnects paired users inactive for > 5 minutes            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
whispr/
├── server/
│   ├── index.ts            # WebSocket server — matching, messaging, lifecycle
│   ├── geo.ts              # Haversine distance calculation
│   └── tsconfig.json       # Server TypeScript config
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout, metadata, global styles
│   │   ├── page.tsx        # App state machine (landing → searching → chatting)
│   │   └── globals.css     # Glass morphism, gradients, late-night theme
│   ├── components/
│   │   ├── LandingScreen.tsx    # Intro → gender selection → mood picker flow
│   │   ├── SearchingScreen.tsx  # Animated radar pulse while finding match
│   │   ├── ChatScreen.tsx       # Message bubbles, input, header with distance
│   │   └── TypingIndicator.tsx  # Animated 3-dot bounce
│   ├── hooks/
│   │   ├── useSocket.ts        # Socket.IO connection, all event handlers
│   │   ├── useGeolocation.ts   # Browser Geolocation API wrapper
│   │   └── useTimeOfDay.ts     # Late night detection (10 PM – 5 AM)
│   └── lib/
│       └── geo.ts              # Client-side Haversine (shared logic)
├── .env.local                  # NEXT_PUBLIC_SOCKET_URL
├── tailwind.config.ts          # Custom color palette, fonts
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## How It Works (Step by Step)

### 1. User Opens App
The client connects to the WebSocket server immediately. The server broadcasts the updated online count to all clients.

### 2. Onboarding Flow
The user goes through a 3-step flow:
1. **Location** — Browser Geolocation API requests GPS coordinates (high accuracy mode, 10s timeout, cached for 60s)
2. **Gender** — Select "Male" or "Female", then choose who to talk to ("Male", "Female", or "Anyone")
3. **Mood** — Pick current vibe from 6 options

### 3. Finding a Match
The client emits `find-match` with `{ latitude, longitude, mood, gender, genderPreference }`. The server:
1. Registers the user in the `users` Map
2. Scans the `waitingQueue` (FIFO order) for the first candidate where:
   - Haversine distance between both users ≤ 10 km
   - Gender preferences are bidirectionally satisfied (user wants candidate's gender AND candidate wants user's gender)
3. If a match is found: both users receive `matched` with `{ distance, partnerMood }`
4. If no match: user is appended to the waiting queue

### 4. Chatting
- Messages are relayed server-side — sender emits `send-message`, server forwards `message` to the partner
- Rate limited to 30 messages per 60-second sliding window
- Messages are capped at 500 characters
- The UI shows only the last 4 messages with the oldest fading out via blur + opacity
- Typing state is forwarded as a boolean; auto-resets after 2 seconds of no input

### 5. Skip / Next
Emits `skip` with current preferences. The server disconnects the current partner (they receive `partner-disconnected`), then immediately re-attempts matching with the updated preferences.

### 6. Disconnect
Emits `leave`. Server cleans up all state: removes from users Map, removes from waiting queue, notifies partner.

---

## Matching Algorithm

```
for each candidate in waitingQueue (FIFO order):
    if candidate is self → skip
    if candidate no longer exists in users Map → remove from queue, skip

    distance = haversine(user.lat, user.lng, candidate.lat, candidate.lng)

    if distance > 10 km → skip

    if user.genderPreference ≠ "anyone" AND user.genderPreference ≠ candidate.gender → skip
    if candidate.genderPreference ≠ "anyone" AND candidate.genderPreference ≠ user.gender → skip

    → MATCH FOUND (remove candidate from queue, pair both users)

if no match found → append user to waitingQueue
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | Next.js 14 (App Router) | SSR-capable React framework with file-based routing |
| UI | React 18 | Component architecture, hooks |
| Styling | Tailwind CSS 3 | Utility-first CSS with custom design tokens |
| Animations | Framer Motion | Page transitions, message animations, radar pulse |
| Real-time (client) | Socket.IO Client | WebSocket with automatic reconnection and fallback |
| Server runtime | Node.js + TypeScript | Event-driven WebSocket server |
| Real-time (server) | Socket.IO | Handles rooms, broadcasting, connection lifecycle |
| Build tooling | tsx | TypeScript execution for the server without compilation step |
| Process management | concurrently | Runs frontend and server in parallel |
| Geolocation | Browser Geolocation API | GPS coordinates from the device |
| Distance calculation | Haversine formula | Great-circle distance between two lat/lng points |

---

## Design System

The UI uses a dark glassmorphism aesthetic:

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#0a0a0b` | Page background |
| `surface-raised` | `#141416` | Glass panels |
| `accent` | `#6366f1` (Indigo) | Buttons, active states, sent messages |
| `text-primary` | `#f5f5f7` | Main text |
| `text-secondary` | `#a1a1aa` | Supporting text |
| `text-muted` | `#52525b` | Placeholder, metadata |

**Glass effect**: Semi-transparent backgrounds with `backdrop-filter: blur()` and subtle 1px borders at 4–6% white opacity.

**Late night mode** (10 PM – 5 AM): Deeper background with slightly more vivid accent glows.

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Installation

```bash
git clone https://github.com/sharmaVipin101/whispr.git
cd whispr
npm install
```

### Environment Variables

Create a `.env.local` file in the project root (or use the existing one):

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | WebSocket server URL the client connects to |
| `PORT` (server) | `3001` | Port the WebSocket server listens on |
| `CLIENT_URL` (server) | `http://localhost:3000` | Allowed CORS origin for the WebSocket server |

### Running Locally

Start both the Next.js frontend and WebSocket server simultaneously:

```bash
npm run dev:all
```

This runs:
- **Next.js dev server** on `http://localhost:3000`
- **WebSocket server** on `http://localhost:3001`

Alternatively, run them separately in two terminals:

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — WebSocket server
npm run dev:server
```

### Production Build

```bash
npm run build
npm run start        # Starts the Next.js production server on port 3000
```

For the WebSocket server in production, deploy it separately with a process manager like PM2 or as a containerized service.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start Next.js in development mode |
| `dev:server` | `npx tsx server/index.ts` | Start the WebSocket server |
| `dev:all` | `concurrently "npm run dev" "npm run dev:server"` | Start both in parallel |
| `build` | `next build` | Create optimized production build |
| `start` | `next start` | Serve production build |
| `lint` | `eslint` | Run ESLint |

---

## Socket Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `find-match` | `{ latitude, longitude, mood, gender, genderPreference }` | Register and attempt to find a match |
| `send-message` | `{ id: string, text: string }` | Send a chat message to partner |
| `typing` | `boolean` | Notify partner of typing state |
| `skip` | `{ latitude, longitude, mood, gender, genderPreference }` | Skip current partner, re-enter queue |
| `leave` | — | Gracefully disconnect from session |
| `report` | — | Report current partner |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `online-count` | `number` | Broadcast total connected users |
| `matched` | `{ distance: number, partnerMood: string }` | Successfully paired with a partner |
| `message` | `{ id: string, text: string }` | Incoming message from partner |
| `partner-typing` | `boolean` | Partner's typing state changed |
| `partner-disconnected` | — | Partner left or was disconnected |

---

## Safety & Limits

| Mechanism | Value | Behavior |
|-----------|-------|----------|
| Max match radius | 10 km | Users beyond this distance are never paired |
| Message max length | 500 chars | Longer messages are silently dropped |
| Rate limit | 30 msgs / 60s | Excess messages are silently dropped |
| Inactivity timeout | 5 minutes | Paired users auto-disconnected if no messages sent |
| Visible messages | Last 4 | Older messages fade out with blur for privacy |

---

## Limitations & Future Work

- **No persistence** — All state is in-memory. Server restart clears all connections and the waiting queue.
- **Single server** — No horizontal scaling. A production deployment would need Redis pub/sub for multi-instance coordination (ioredis is already a dependency for this purpose).
- **No moderation** — Reports are logged to console but no automated action is taken.
- **No authentication** — Fully anonymous by design, but means abuse prevention is limited to rate limiting.
- **Location spoofing** — Client-reported coordinates are trusted; no server-side verification.

---

## License

MIT
