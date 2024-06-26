
//POLLSTER LOAD

import { Contest } from "./contests/contest";
import { PresidentialRace, loadPresidentialContests, predictPresidentialRace } from "./contests/presidentialRace";
import { Poll } from "./polling/poll";
import { loadPollsters } from "./pollster/pollster";

const POLLSTERS = loadPollsters();

for (const [pollsterName, pollster] of POLLSTERS.entries()){
    console.log("Pollster " + pollsterName + " bias: " + pollster.pastBias);
}

const popularVote: Contest = {name: "PP", environment: {mean: 0, std: 0}, predictedEnvironment: null, polls: []};


const poll1: Poll = {
    pollster: POLLSTERS.get("YouGov")!,
    date: new Date(),
    generalResult: {
        dem: .485,
        rep: .495,
        other: .02,
    }
}

const poll2: Poll = {
    pollster: POLLSTERS.get("Fox News")!,
    date: new Date(),
    generalResult: {
        dem: .495,
        rep: .485,
        other: .03,
    }
}

popularVote.polls.push(poll1);
popularVote.polls.push(poll2);

const presidentialRace: PresidentialRace = {
    popularVote: popularVote,
    contests: loadPresidentialContests(),
}

//predictPresidentialRace(presidentialRace);
console.log(predictPresidentialRace(presidentialRace));