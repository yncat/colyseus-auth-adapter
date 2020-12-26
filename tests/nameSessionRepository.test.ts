import { promisify } from "util";
import * as redis from "redis-mock";
import { mocked } from 'ts-jest/utils';

import NameSessionRepository from "../nameSessionRepository";
import NameSession from "../nameSession";
import { RedisClient, Callback, ClientOpts } from "redis";

class MalfunctioningRedisClient extends RedisClient {
	constructor(opts: ClientOpts) { }
	public get(key: string, cb?: Callback<string>): boolean {
		if (cb) {
			cb(new Error("error"), null);
		}
		return true;
	}
}

const rdc = redis.createClient();
const mrdc = new MalfunctioningRedisClient({} as ClientOpts);

describe("get", () => {
	beforeAll((done) => {
		rdc.mset(
			"test_session",
			JSON.stringify({ playerName: "cat", isLoggedIn: true }),
			(err, res) => {
				done();
			}
		);
	});

	it("returns NameSession when an existing session ID is given", async () => {
		const wantNameSession: NameSession = {
			sessionID: "test_session",
			playerName: "cat",
			isLoggedIn: true,
		};
		const repo = new NameSessionRepository(rdc);
		const nameSession = await repo.get("test_session");
		expect(nameSession).toStrictEqual(wantNameSession);
	});

	it("returns null when the given session is not found", async () => {
		const repo = new NameSessionRepository(rdc);
		const nameSession = await repo.get("nonexistent_session");
		expect(nameSession).toBe(null);
	});

	it("rejects when redis operation fails", async () => {
		const repo = new NameSessionRepository(mrdc);
		expect(repo.get("test_session")).rejects.toMatchObject(new Error("error"));
	});
});

describe("set", () => {
	beforeAll((done) => {
		rdc.mset(
			"test_session",
			JSON.stringify({ playerName: "cat", isLoggedIn: true }),
			(err, res) => {
				done();
			}
		);
	});

	it("sets the given session", async () => {
		const repo = new NameSessionRepository(rdc);
		const nameSession: NameSession = {
			sessionID: "new_name_session",
			playerName: "cat",
			isLoggedIn: true,
		};
		const unused = await repo.set(nameSession);

		const getAsync = promisify(rdc.get).bind(rdc);
		const ret = await getAsync("new_name_session");
		const wantNameSession = JSON.stringify({
			playerName: "cat",
			isLoggedIn: true,
		});
		expect(ret).toBe(wantNameSession);
	});

});
