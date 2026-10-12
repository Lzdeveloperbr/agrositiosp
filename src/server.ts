import serverEntry from "@tanstack/react-start/server-entry";
import { handleLiveRequest } from "./lib/live-relay.server";

export default {
  async fetch(request: Request) {
    if (new URL(request.url).pathname === "/api/live") return handleLiveRequest(request);
    return serverEntry.fetch(request);
  },
};
