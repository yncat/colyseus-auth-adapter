import { v4 as uuidv4 } from "uuid";
import * as express from "express";
import * as redis from "redis";

export type middlewareFunction = (
  req: express.Request,
  res: express.Response
) => void;

export interface NameSession {
  sessionID: string;
  playerName: string;
}

export interface CommonErrorResponse {
  code: number;
  message: string;
}

export function newNameSession(rdc: redis.RedisClient): middlewareFunction {
  return (req, res) => {
    const playerName = req.query.playerName;
    if (!playerName || playerName === "") {
      renderError(res, 400, "playerName is required");
      return;
    }
    const sessionID: string = uuidv4();
    rdc.set(sessionID, playerName as string);
    const ret: NameSession = {
      sessionID: sessionID,
      playerName: playerName as string,
    };
    res.json(ret);
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
