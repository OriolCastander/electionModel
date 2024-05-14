/**
 * The presidential contest
 */

import * as fs from 'fs';

import { Normal, constructNormal, randomNormal } from "../utils/normal";
import { STATES } from "../utils/utils";
import { Contest, ContestPredictionConfig, predictContest } from "./contest";
import { Result } from '../utils/results';


export type PresidentialContestsName = STATES | "Maine 1st" | "Maine 2nd" | "Nebraska 1st" | "Nebraska 2nd" | "Nebraska 3rd" |
"District of Columbia";

export interface PresidentialContest extends Contest{
    
    name: PresidentialContestsName;

    /** Number of electors of that state */
    electors: number;
}


export interface PresidentialRace{
    
    /** Pointer to the popular vote object, used for */
    popularVote: Contest;

    /** All separate races of the electoral college */
    contests: Map<PresidentialContestsName, PresidentialContest>;

}


export const loadPresidentialContests = (): Map<PresidentialContestsName, PresidentialContest> =>{

    const map = new Map<PresidentialContestsName, PresidentialContest>();

    //WARNING: LOADING DATA FROM THIS FILE IS TEMPORARY (MAYBE?)
    const file = fs.readFileSync("./data/past_presidential.csv");
    const data = file.toString("utf-8").split("\r\n");

    for (let i=1; i<data.length; i++){
        const stuff = data[i].split(",");
        var name: PresidentialContestsName = stuff[0] as PresidentialContestsName; //TRY CATCH?
        var electors = parseInt(stuff[2]);

        const results: Result[] = [];

        for (let j=0; j<2; j++){
            var dem = parseInt(stuff[7 + j * 3]);
            var rep = parseInt(stuff[8 + j * 3]);
            var tot = parseInt(stuff[9 + j * 3]);

            var result: Result = {
                dem: dem / tot,
                rep: rep / tot,
                other: (tot - rep - dem) / tot,
            }

            results.push(result);
        }

        const environment = constructNormal(results.map(r => r.dem - r.rep));

        map.set(name, {name: name, electors: electors, environment: environment, predictedEnvironment: null, polls: []});
        
    }
    

    return map;
}






/**
 * Returns the probability of democrats winning the presidential race
 * TODO: what if tie at 269?
 */
export const predictPresidentialRace = (presidentialRace: PresidentialRace): number =>{

    var demwins = 0;
    var repWins = 0;

    for (let i=0; i<10000; i++){

        var secenarioFavorability = randomNormal({mean:0.0, std: 1.0});

        var popularVoteResult = predictContest(presidentialRace.popularVote, {normalShift: secenarioFavorability});

        var demElectors = 0;
        const config: ContestPredictionConfig = {
            environment: {
                environmentPercentage: .5,
                result: popularVoteResult,
            }
        };

        for (const contest of presidentialRace.contests.values()){
            var contestShift = randomNormal({mean:0.0, std:1.0}) * randomNormal(contest.environment!);
            var contestFavorability = secenarioFavorability + contestShift;

            var constestResult = predictContest(contest, {...config, normalShift: contestFavorability});
            if (constestResult > 0){demElectors += contest.electors;}
        }

        if (demElectors > 269){demwins += 1;}
        else{repWins += 1;}
    }

    return demwins / (demwins + repWins);

}