import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server, Socket } from "socket.io";
import { haversineDistance } from "./server/geo";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

const MAX_RADIUS_KM = 10;
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const RATE_LIMIT_MESSAGES = 30;
const RATE_LIMIT_WINDOW_MS = 60000;

type Gender = "male" | "female";
type GenderPreference = "male" | "female" | "anyone";

interface User {
  socketId: string;
  latitude: number;
  longitude: number;
  mood: string | null;
  gender: Gender | null;
  genderPreference: GenderPreference | null;
  partnerId: string | null;
  lastActivity: number;
  messageCount: number;
  messageWindowStart: number;
}

const users = new Map<string, User>();
const waitingQueue: string[] = [];

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  function broadcastOnlineCount() {
    io.emit("online-count", users.size);
  }

  function genderMatches(user: User, candidate: User): boolean {
    if (!user.gender || !user.genderPreference || !candidate.gender || !candidate.genderPreference) {
      return false;
    }
    const userWantsCandidate =
      user.genderPreference === "anyone" || user.genderPreference === candidate.gender;
    const candidateWantsUser =
      candidate.genderPreference === "anyone" || candidate.genderPreference === user.gender;
    return userWantsCandidate && candidateWantsUser;
  }

  function findMatch(socketId: string): string | null {
    const user = users.get(socketId);
    if (!user) return null;

    for (let i = 0; i < waitingQueue.length; i++) {
      const candidateId = waitingQueue[i];
      if (candidateId === socketId) continue;

      const candidate = users.get(candidateId);
      if (!candidate) {
        waitingQueue.splice(i, 1);
        i--;
        continue;
      }

      const distance = haversineDistance(
        user.latitude, user.longitude,
        candidate.latitude, candidate.longitude
      );

      if (distance <= MAX_RADIUS_KM && genderMatches(user, candidate)) {
        waitingQueue.splice(i, 1);
        return candidateId;
      }
    }
    return null;
  }

  function checkRateLimit(user: User): boolean {
    const now = Date.now();
    if (now - user.messageWindowStart > RATE_LIMIT_WINDOW_MS) {
      user.messageCount = 0;
      user.messageWindowStart = now;
    }
    user.messageCount++;
    return user.messageCount <= RATE_LIMIT_MESSAGES;
  }

  function disconnectPartner(socketId: string) {
    const user = users.get(socketId);
    if (user?.partnerId) {
      const partner = users.get(user.partnerId);
      if (partner) {
        partner.partnerId = null;
        io.to(partner.socketId).emit("partner-disconnected");
      }
      user.partnerId = null;
    }
  }

  interface FindMatchData {
    latitude: number;
    longitude: number;
    mood: string | null;
    gender: Gender | null;
    genderPreference: GenderPreference | null;
  }

  io.on("connection", (socket: Socket) => {
    console.log(`Connected: ${socket.id}`);
    broadcastOnlineCount();

    socket.on("find-match", (data: FindMatchData) => {
      if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return;

      const user: User = {
        socketId: socket.id,
        latitude: data.latitude,
        longitude: data.longitude,
        mood: data.mood,
        gender: data.gender || null,
        genderPreference: data.genderPreference || null,
        partnerId: null,
        lastActivity: Date.now(),
        messageCount: 0,
        messageWindowStart: Date.now(),
      };

      users.set(socket.id, user);
      broadcastOnlineCount();

      const matchId = findMatch(socket.id);
      if (matchId) {
        const match = users.get(matchId)!;
        user.partnerId = matchId;
        match.partnerId = socket.id;

        const distance = haversineDistance(
          user.latitude, user.longitude,
          match.latitude, match.longitude
        );

        socket.emit("matched", { distance, partnerMood: match.mood });
        io.to(matchId).emit("matched", { distance, partnerMood: user.mood });
      } else {
        const queueIdx = waitingQueue.indexOf(socket.id);
        if (queueIdx === -1) waitingQueue.push(socket.id);
      }
    });

    socket.on("send-message", (data: { id: string; text: string }) => {
      const user = users.get(socket.id);
      if (!user || !user.partnerId) return;
      if (typeof data.text !== "string" || data.text.length > 500) return;
      if (!checkRateLimit(user)) return;

      user.lastActivity = Date.now();
      io.to(user.partnerId).emit("message", { id: data.id, text: data.text });
    });

    socket.on("typing", (typing: boolean) => {
      const user = users.get(socket.id);
      if (!user || !user.partnerId) return;
      io.to(user.partnerId).emit("partner-typing", typing);
    });

    socket.on("skip", (data: FindMatchData) => {
      disconnectPartner(socket.id);

      const user = users.get(socket.id);
      if (user) {
        user.latitude = data.latitude;
        user.longitude = data.longitude;
        user.mood = data.mood;
        user.gender = data.gender || null;
        user.genderPreference = data.genderPreference || null;
        user.partnerId = null;
      }

      const matchId = findMatch(socket.id);
      if (matchId) {
        const currentUser = users.get(socket.id)!;
        const match = users.get(matchId)!;
        currentUser.partnerId = matchId;
        match.partnerId = socket.id;

        const distance = haversineDistance(
          currentUser.latitude, currentUser.longitude,
          match.latitude, match.longitude
        );

        socket.emit("matched", { distance, partnerMood: match.mood });
        io.to(matchId).emit("matched", { distance, partnerMood: currentUser.mood });
      } else {
        const queueIdx = waitingQueue.indexOf(socket.id);
        if (queueIdx === -1) waitingQueue.push(socket.id);
      }
    });

    socket.on("leave", () => {
      disconnectPartner(socket.id);
      const queueIdx = waitingQueue.indexOf(socket.id);
      if (queueIdx !== -1) waitingQueue.splice(queueIdx, 1);
      users.delete(socket.id);
      broadcastOnlineCount();
    });

    socket.on("report", () => {
      const user = users.get(socket.id);
      if (user?.partnerId) {
        console.log(`Report: ${socket.id} reported ${user.partnerId}`);
        disconnectPartner(socket.id);
      }
    });

    socket.on("disconnect", () => {
      disconnectPartner(socket.id);
      const queueIdx = waitingQueue.indexOf(socket.id);
      if (queueIdx !== -1) waitingQueue.splice(queueIdx, 1);
      users.delete(socket.id);
      broadcastOnlineCount();
      console.log(`Disconnected: ${socket.id}`);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [id, user] of users.entries()) {
      if (user.partnerId && now - user.lastActivity > INACTIVITY_TIMEOUT_MS) {
        disconnectPartner(id);
        io.to(id).emit("partner-disconnected");
      }
    }
  }, 60000);

  httpServer.listen(port, () => {
    console.log(`whispr running on port ${port}`);
  });
});
