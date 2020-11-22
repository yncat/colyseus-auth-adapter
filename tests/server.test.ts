import * as express from "express";
import * as redis from "redis-mock";
import * as request from "supertest";
import { newNameSession } from "../index";

const rdc = redis.createClient();

const app = express();
app.get("/api/new_name_session", newNameSession(rdc));
const server = app.listen(3001);

describe("newNameSession", () => {
  it("returns session ID and player name when a valid request is sent", async () => {
    const response = await request(app).get(
      "/api/new_name_session?playerName=cat"
    );
    expect(response.status).toBe(200);
    expect(/.+-.+-.+-.+/.test(response.body.sessionID)).toBe(true);
    expect(response.body.playerName).toBe("cat");
  });
  it("returns error when playerName is empty", async () => {
    const response = await request(app).get(
      "/api/new_name_session?playerName="
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("playerName is required");
  });
  it("returns error when playerName is not given", async () => {
    const response = await request(app).get("/api/new_name_session");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("playerName is required");
  });
});

afterAll(() => {
  server.close();
});
