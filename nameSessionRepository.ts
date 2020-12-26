import * as redis from "redis";
import NameSession from "./NameSession";

export default class NameSessionRepository {
	rdc: redis.RedisClient;

	constructor(rdc: redis.RedisClient) {
		this.rdc = rdc;
	}

	public get(sessionID: string): Promise<NameSession> {
		return new Promise<NameSession>((resolve, reject) => {
			let ses: string;
			this.rdc.get(sessionID, (err, res) => {
				if (err) {
					reject(err);
				}
				const obj = JSON.parse(res);
				const nameSession: NameSession = {
					sessionID: sessionID,
					playerName: obj.playerName,
					isLoggedIn: obj.isLoggedIn,
				};
				resolve(nameSession);
			});
		});
	}
}

