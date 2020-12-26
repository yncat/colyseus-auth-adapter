import * as express from "express";
import * as redis from "redis-mock";
import * as request from "supertest";
import { promisify } from "util";
import { newNameSession, checkoutNameSession, loginByNameSession } from "../index";

const rdc = redis.createClient();

const app = express();
app.get("/api/new_name_session", newNameSession(rdc));
app.get("/api/checkout_name_session", checkoutNameSession(rdc));
app.get("/api/login_by_name_session", loginByNameSession(rdc));
const server = app.listen(3001);

describe("newNameSession", () => {
  it("returns session ID and player name when a valid request is sent", async () => {
    const response = await request(app).get(
      "/api/new_name_session?playerName=cat"
    );
    expect(response.status).toBe(200);
    expect(/.+-.+-.+-.+/.test(response.body.sessionID)).toBe(true);
    expect(response.body.playerName).toBe("cat");
    expect(response.body.isLoggedIn).toBe(false);
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

describe("checkoutNameSession", () => {
  beforeAll((done) => {
    rdc.mset(
      "logged_out_session",
      JSON.stringify({ playerName: "cat", isLoggedIn: false }),
      "logged_in_session",
      JSON.stringify({ playerName: "cat", isLoggedIn: true }),
      (err, res) => {
        done();
      }
    );
  });

  it("returns name session info when an existing session ID is given", async () => {
    const response = await request(app).get(
      "/api/checkout_name_session?sessionID=logged_out_session"
    );
    expect(response.status).toBe(200);
    expect(response.body.sessionID).toBe("logged_out_session");
    expect(response.body.playerName).toBe("cat");
    expect(response.body.code).toBe("logged_out");
  });
  it("returns name session info when an existing logged in session ID is given", async () => {
    const response = await request(app).get(
      "/api/checkout_name_session?sessionID=logged_in_session"
    );
    expect(response.status).toBe(200);
    expect(response.body.sessionID).toBe("logged_in_session");
    expect(response.body.playerName).toBe("cat");
    expect(response.body.code).toBe("logged_in");
  });
  it("returns unavailable session info when an nonexistent session ID is given", async () => {
    const response = await request(app).get(
      "/api/checkout_name_session?sessionID=nonexistent_session"
    );
    expect(response.status).toBe(200);
    expect(response.body.sessionID).toBe("nonexistent_session");
    expect(response.body.code).toBe("unavailable");
  });
  it("returns error when sessionID is not given", async () => {
    const response = await request(app).get("/api/checkout_name_session");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("sessionID is required");
  });
});
describe("loginByNameSession", () => {
  beforeAll((done) => {
    rdc.mset(
      "logged_out_session",
      JSON.stringify({ playerName: "cat", isLoggedIn: false }),
      "logged_in_session",
      JSON.stringify({ playerName: "cat", isLoggedIn: true }),
      (err, res) => {
        done();
      }
    );
  });

  it("changes session to logged in and returns a blank JSON response when a logged out session is given", async () => {
    const response = await request(app).get(
      "/api/login_by_name_session?sessionID=logged_out_session"
    );
    expect(response.status).toBe(200);

    // check name session on redis
    const getAsync = promisify(rdc.get).bind(rdc);
    const ses = await getAsync("logged_out_session");
    const nameSession = JSON.parse(ses);
    expect(nameSession.isLoggedIn).toBe(true);
  });

  it("returns 403 when the given nameSession is already logged in", async () => {
    const response = await request(app).get(
      "/api/login_by_name_session?sessionID=logged_in_session"
    );
    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Name session already logged in. NameSession: logged_in_session");
  });

  it("returns 404 when the given nameSession doesn't exist on redis", async () => {
    const response = await request(app).get(
      "/api/login_by_name_session?sessionID=nonexistent_session"
    );
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("NameSession not found. NameSession: nonexistent_session");
  });

  it("returns 500 when sessionID is not given", async () => {
    const response = await request(app).get("/api/login_by_name_session");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("sessionID is required");
  });
});

afterAll(() => {
  server.close();
});
