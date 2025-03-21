import Redis from "ioredis";

const redis = new Redis({ host: "redis", port: 6379 });

async function MatchMaking() {
    while(true) {
        const result1 = await redis.brpop("matchMaking-queue", 0);
        const result2 = await redis.brpop("matchMaking-queue", 0);

        if(result1 && result2) {
            const [_,  player1UUID] = result1;
            const [__, player2UUID] = result2;
            
            await redis.publish("match-notification", JSON.stringify({ player1: player1UUID, player2: player2UUID }));
            console.log(`Match notify: ${player1UUID} & ${player2UUID}`);
        }
    }
}

MatchMaking();
console.log("Match making server is running");