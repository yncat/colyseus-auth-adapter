import { v4 as uuidv4 } from "uuid";
import * as express from "express";
import * as redis from "redis";
import { promisify } from "util";

export type middlewareFunction = (
  req: express.Request,
  res: express.Response
) => void;

export interface NameSession {
  sessionID: string;
  playerName: string;
  isLoggedIn: boolean;
}

export interface NameSessionCheckoutResult {
  sessionID: string;
  playerName: string;
  code: NameSessionCheckoutResultCode;
}

export type NameSessionCheckoutResultCode =
  | "logged_out"
  | "logged_in"
  | "unavailable";

export interface CommonErrorResponse {
  code: number;
  message: string;
}

export const SESSION_TTL = 60 * 60 * 24 * 7; // 1 week

export function newNameSession(rdc: redis.RedisClient): middlewareFunction {
  return (req, res) => {
    const playerName = req.query.playerName;
    if (!playerName || playerName === "") {
      renderError(res, 400, "playerName is required");
      return;
    }
    const sessionID: string = uuidv4();
    rdc.set(sessionID, playerName as string, "EX", SESSION_TTL);
    const ret: NameSession = {
      sessionID: sessionID,
      playerName: playerName as string,
      isLoggedIn: false,
    };
    res.json(ret);
  };
}

export function checkoutNameSession(
  rdc: redis.RedisClient
): middlewareFunction {
  return async (req, res) => {
    if (!req.query.sessionID || req.query.sessionID === "") {
      renderError(res, 400, "sessionID is required");
      return;
    }
    const sessionID = req.query.sessionID as string;
    const existsAsync = promisify(rdc.exists).bind(rdc);
    let exists: number;
    try {
      exists = await existsAsync(sessionID);
    } catch (e) {
      renderError(res, 500, e.toString);
      return;
    }

    if (exists === 0) {
      const ret: NameSessionCheckoutResult = {
        sessionID: sessionID,
        playerName: "",
        code: "unavailable",
      };
      res.json(ret);
      return;
    }

    const getAsync = promisify(rdc.get).bind(rdc);
    let ses: string;
    try {
      ses = await getAsync(sessionID);
    } catch (e) {
      renderError(res, 500, e.toString);
      return;
    }
    const nameSession = JSON.parse(ses);

    const ret: NameSessionCheckoutResult = {
      sessionID: sessionID,
      playerName: nameSession.playerName,
      code: nameSession.isLoggedIn === true ? "logged_in" : "logged_out",
    };

    res.json(ret);
  };
}

export function loginByNameSession(
  rdc: redis.RedisClient
): middlewareFunction {
  return async (req, res) => {
    if (!req.query.sessionID || req.query.sessionID === "") {
      renderError(res, 400, "sessionID is required");
      return;
    }
    const sessionID = req.query.sessionID as string;
    const existsAsync = promisify(rdc.exists).bind(rdc);
    let exists: number;
    try {
      exists = await existsAsync(sessionID);
    } catch (e) {
      renderError(res, 500, e.toString);
      return;
    }

    if (exists === 0) {
      renderError(res, 404, "NameSession not found. NameSession: "+sessionID)
      return;
    }

    const getAsync = promisify(rdc.get).bind(rdc);
    let ses: string;
    try {
      ses = await getAsync(sessionID);
    } catch (e) {
      renderError(res, 500, e.toString);
      return;
    }
    const nameSession = JSON.parse(ses);
    nameSession.isLoggedIn=true;
    rdc.set(sessionID,JSON.stringify(nameSession));
    res.json({});
  };
}

function renderError(
  res: express.Response,
  code: number,
  message: string
): void {
  res.status(code).json({
    code: code,
    message: message,
  });
}
