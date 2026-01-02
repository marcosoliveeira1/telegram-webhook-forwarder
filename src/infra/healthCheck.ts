import http from "node:http";
import { TelegramService } from "./telegramClient";

export class HealthCheckServer {
  constructor(private telegramService: TelegramService, private port: number = 3000) {}

  start() {
    const server = http.createServer((req, res) => {
      if (req.url === "/health") {
        const isConnected = this.telegramService.isConnected();
        
        if (isConnected) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "OK", telegram: "connected" }));
        } else {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ERROR", telegram: "disconnected" }));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(this.port, () => {
      console.log(`🏥 Health check server running on port ${this.port}`);
    });
  }
}