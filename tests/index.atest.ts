import * as adapter from "../index";
import * as express from "express";
import { RedisClient } from "redis";
import * as redis from "redis-mock";

test("newNameSession", () => {
  const req = {} as express.Request;
  const res = {
    json: (body) => {},
  } as express.Response;
  const rdc: redis.RedisClient = redis.createClient();
  const fn: adapter.middlewareFunction = adapter.newNameSession(rdc);
  fn(req, res);
});
