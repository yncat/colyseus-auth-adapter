import { v4 as uuidv4 } from "uuid";
import * as express from "express";
import NameSession from "./nameSession";
import NameSessionRepository from "./nameSessionRepository";

export type middlewareFunction = (
  req: express.Request,
  res: express.Response
) => void;

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


export function newNameSession(repo: NameSessionRepository): middlewareFunction {
  return (req, res) => {
    const playerName = req.query.playerName;
    if (!playerName || playerName === "") {
      renderError(res, 400, "playerName is required");
      return;
    }
    const sessionID: string = uuidv4();
    const nameSession: NameSession = {
      sessionID: sessionID,
      playerName: playerName as string,
      isLoggedIn: false,
    };
    repo.set(nameSession);
    res.json(nameSession);
  };
}

export function checkoutNameSession(
  repo: NameSessionRepository
): middlewareFunction {
  return async (req, res) => {
    if (!req.query.sessionID || req.query.sessionID === "") {
      renderError(res, 400, "sessionID is required");
      return;
    }
    const sessionID = req.query.sessionID as string;
    let nameSession: NameSession;
    try {
      nameSession = await repo.get(sessionID);
    } catch (e) {
      renderError(res, 500, e.toString);
      return;
    }

    if (nameSession === null) {
      const ret: NameSessionCheckoutResult = {
        sessionID: sessionID,
        playerName: "",
        code: "unavailable",
      };
      res.json(ret);
      return;
    }

    const ret: NameSessionCheckoutResult = {
      sessionID: sessionID,
      playerName: nameSession.playerName,
      code: nameSession.isLoggedIn === true ? "logged_in" : "logged_out",
    };

    res.json(ret);
  };
}

export function loginByNameSession(
  repo: NameSessionRepository
): middlewareFunction {
  return async (req, res) => {
    if (!req.query.sessionID || req.query.sessionID === "") {
      renderError(res, 400, "sessionID is required");
      return;
    }
    const sessionID = req.query.sessionID as string;
    let nameSession: NameSession;
    try {
      nameSession = await repo.get(sessionID);
    } catch (e) {
      renderError(res, 500, e.toString);
      return;
    }

    if (nameSession === null) {
      renderError(res, 404, "NameSession not found. NameSession: " + sessionID)
      return;
    }

    if (nameSession.isLoggedIn) {
      renderError(res, 403, "Name session already logged in. NameSession: " + sessionID);
      return;
    }

    nameSession.isLoggedIn = true;
    repo.set(nameSession);
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
