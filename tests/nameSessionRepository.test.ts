import * as redis from "redis-mock";
import NameSessionRepository from "../nameSessionRepository";
import NameSession from "../nameSession";

const rdc = redis.createClient();

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
});
