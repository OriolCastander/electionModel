/**
 * The presidential contest
 */

import * as fs from 'fs';

import { Normal, constructNormal, constructWeightedNormal, randomNormal } from "../utils/normal";
import { STATES } from "../utils/utils";
import { Contest, ContestPredictionConfig, predictContest } from "./contest";
import { Result } from '../utils/results';


export type PresidentialContestsName = STATES | "Maine 1st" | "Maine 2nd" | "Nebraska 1st" | "Nebraska 2nd" | "Nebraska 3rd" |
"District of Columbia";

export interface PresidentialContest extends Contest{
    
    name: PresidentialContestsName;

    /** Number of electors of that state */
    electors: number;

    /** Key is the year of the presidential result and val is the result in absolute number of votes */
    pastPresidentialResults: Map<number, Result>;

    /** Key is the year of the result and val is the result in absolute number of votes (for house candidates in the state) */
    pastHouseStatewideResults: Map<number, Result> | null;
}


export interface PresidentialRace{
    
    /** Pointer to the popular vote object, used for */
    popularVote: Contest;

    /** All separate races of the electoral college */
    contests: Map<PresidentialContestsName, PresidentialContest>;

}

/**
 * Loads the presidential constests from file. Does not populate the environment or the predicted environment
 */
export const loadPresidentialContests = (): Map<PresidentialContestsName, PresidentialContest> =>{

    const map = new Map<PresidentialContestsName, PresidentialContest>();

    ///WE CURRENTLY NEED TO LOAD THE FILE FOR NUMBER OF ELECTORS
    const file = fs.readFileSync("./data/past_presidential.csv");
    const data = file.toString("utf-8").split("\r\n");

    ///LOAD THE PRESIDENTIAL AND HOUSE DATA
    const presidentialData = loadPastPresidentialData();
    const houseData = loadPastHouseStatewideData();

    for (let i=1; i<data.length; i++){
        const stuff = data[i].split(",");
        var name: PresidentialContestsName = stuff[0] as PresidentialContestsName; //TRY CATCH?
        var electors = parseInt(stuff[2]);

        const presidentialContest: PresidentialContest = {
            name: name,
            electors: electors,
            pastPresidentialResults: presidentialData.get(name)!,
            pastHouseStatewideResults: houseData.has(name) ? houseData.get(name)! : null,
            
            environment: null,
            predictedEnvironment: null,
            polls: [],
        }

        map.set(name, presidentialContest);
        
    }
    

    return map;
}

/**
 * Loads from file the past results of the presidential elections per each year. Results have absolute numbers, not percentages
 */
const loadPastPresidentialData = (): Map<PresidentialContestsName, Map<number, Result>>  =>{

    const pastResultsByState: Map<PresidentialContestsName, Map<number, Result>> = new Map();

    
    const file = fs.readFileSync("./data/past_presidential.csv");
    const data = file.toString("utf-8").split("\r\n");

    for (let i=1; i<data.length; i++){
        const stuff = data[i].split(",");
        var name: PresidentialContestsName = stuff[0] as PresidentialContestsName; //TRY CATCH?
        
        var pastResults: Map<number, Result> = new Map();

        for (let j=0; j<2; j++){
            var dem = parseInt(stuff[7 + j * 3]);
            var rep = parseInt(stuff[8 + j * 3]);
            var tot = parseInt(stuff[9 + j * 3]);

            var result: Result = {
                dem: dem,
                rep: rep,
                other: (tot - rep - dem),
            }

            pastResults.set(2016 + j * 4, result);
        }

        pastResultsByState.set(name, pastResults);        
    }

    return pastResultsByState;
}


/**
 * Loads from file the results of the statewide "popular vote" for house elections by state and year. Results are absolute numbers
 */
const loadPastHouseStatewideData = (): Map<PresidentialContestsName, Map<number, Result>> => {

    const pastResultsByState: Map<PresidentialContestsName, Map<number, Result>> = new Map();

    const file = fs.readFileSync("./data/past_house.csv");
    const data = file.toString("utf-8").split("\r\n");

    for (let i=1; i<data.length; i++){
        const stuff = data[i].split(",");
        var name: PresidentialContestsName = stuff[0] as PresidentialContestsName; //TRY CATCH?
        var pastResults: Map<number, Result> = new Map();

        for (let j=0; j<4; j++){
            var dem = parseInt(stuff[1 + j * 3]);
            var rep = parseInt(stuff[2 + j * 3]);
            var tot = parseInt(stuff[3 + j * 3]);

            var result: Result = {
                dem: dem,
                rep: rep,
                other: (tot - rep - dem),
            }

            pastResults.set(2016 + j * 2, result);
        }

        pastResultsByState.set(name, pastResults); 
    }

    return pastResultsByState;
    
}



////PREDICTIONS


export interface PresidentialRacePredictionConfig {

    /** In calculating the environment of a state, how much we take into account that year's popular vote.
     * I.e. if colorado is dem +8 but the popular vote was dem +2, should colorado be D+8 or D+6?
     */
    popularVoteFactor: number;

    recencyFactor: number;

    houseToPresidentialRatio: number;

}


export interface PresidentialRacePredictionOutput {
    /** Probability of dems winning the presidential race */
    probability: number;

    /** Dem electoral votes */
    electoralVotes: Normal;

    /** Probability of dems winning each state and the normal of the margin */
    states: Map<PresidentialContestsName, {probability: number, margin: Normal}>;

}



/**
 * Returns the probability of democrats winning the presidential race
 * TODO: what if tie at 269?
 */
export const predictPresidentialRace = (presidentialRace: PresidentialRace, config: PresidentialRacePredictionConfig | null=null): PresidentialRacePredictionOutput =>{

    if (config == null){
        config = {popularVoteFactor: .7, recencyFactor: .3, houseToPresidentialRatio: .3};
    }


    //STEP 1: SET THE ENVIRONMENTS OF THE RACE BASED ON THE CONFIG
    setStatesEnvironment(presidentialRace, config);

    var demElectoralVotes: number[] = [];

    var statesMargins: Map<PresidentialContestsName, number[]> = new Map();
    for (const contestName of presidentialRace.contests.keys()){
        statesMargins.set(contestName, []);
    } 

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
            statesMargins.get(contest.name)?.push(constestResult);
        }

        demElectoralVotes.push(demElectors);

    }

    const states: Map<PresidentialContestsName, {probability: number, margin: Normal}> = new Map();
    for (const [stateName, stateMargins] of statesMargins.entries()){
        states.set(stateName, {probability: stateMargins.filter(sm => sm > 0).length / stateMargins.length, margin: constructNormal(stateMargins)});
    }

    return {
        electoralVotes: constructNormal(demElectoralVotes),
        probability: demElectoralVotes.filter((d) => d > 269).length / demElectoralVotes.length,
        states: states
    };

}

/**
 * Sets the environments for the states of a presidential race in accordance with the config parameters
 */
const setStatesEnvironment = (presidentialRace: PresidentialRace, config: PresidentialRacePredictionConfig): void =>{

    //CALCULATE POPULAR VOTES MARGINS

    const presidentialPopularVoteMargins: Map<number, number> = new Map();

    for (const year of [2016, 2020]){
        var repVotes = 0;
        var demVotes = 0;
        var otherVotes = 0;
        for (const [stateName, contest] of presidentialRace.contests.entries()){
            repVotes += contest.pastPresidentialResults.get(year)!.rep;
            demVotes += contest.pastPresidentialResults.get(year)!.dem;
            otherVotes += contest.pastPresidentialResults.get(year)!.other;
        }
        var totalVotes = repVotes + demVotes + otherVotes;
        presidentialPopularVoteMargins.set(year, (demVotes - repVotes) / totalVotes);
    }

    const housePopularVoteMargins: Map<number, number> = new Map();
    for (const year of [2016, 2018, 2020, 2022]){
        var repVotes = 0;
        var demVotes = 0;
        var otherVotes = 0;
        for (const [stateName, contest] of presidentialRace.contests.entries()){
            if (contest.pastHouseStatewideResults == null){continue;}

            repVotes += contest.pastHouseStatewideResults.get(year)!.rep;
            demVotes += contest.pastHouseStatewideResults.get(year)!.dem;
            otherVotes += contest.pastHouseStatewideResults.get(year)!.other;
        }

        var totalVotes = repVotes + demVotes + otherVotes;
        housePopularVoteMargins.set(year, (demVotes - repVotes) / totalVotes);
    }



    for (const [stateName, contest] of presidentialRace.contests.entries()){
        
        /** Computes the factor that should be applied because of the age of the result in the weight calculation */
        const getYearWeightFactor = (year: number, isPresidential: boolean): number =>{

            const cutoff = isPresidential ? 2020 : 2022;
            
            //1 IS MOST RECENT, 0 IS MOST OLD
            const oldFactor =  1 - ((cutoff - year) / (cutoff - 2016));

            return oldFactor * (1 - config.recencyFactor) + config.recencyFactor;
        }

        //ENVIRONMENT (WEIGHTED MEAN OF PAST RESULTS)
        const vals = [];
        const weights = [];

        for (const year of [2016, 2020]){
            const res = contest.pastPresidentialResults.get(year)!;
            const totalVotes = res.dem + res.rep + res.other;

            const margin = (res.dem - res.rep) / totalVotes;
            const shifedMargin = margin - presidentialPopularVoteMargins.get(year)!;
            vals.push(margin * (1 - config.popularVoteFactor) + shifedMargin * config.popularVoteFactor);
            weights.push(getYearWeightFactor(year, true));
        }

        if (contest.pastHouseStatewideResults != null){
            for (const year of [2016, 2018, 2020, 2022]){
                const res = contest.pastHouseStatewideResults.get(year)!;
                const totalVotes = res.dem + res.rep + res.other;
    
                const margin = (res.dem - res.rep) / totalVotes;
                const shifedMargin = margin - housePopularVoteMargins.get(year)!;
                vals.push(margin * (1 - config.popularVoteFactor) + shifedMargin * config.popularVoteFactor);
                weights.push(getYearWeightFactor(year, false) * config.houseToPresidentialRatio / 2);
            }
        }

        const environment = constructWeightedNormal(vals, weights);
        contest.environment = environment;

        if (stateName == "Wyoming"){
            console.log(vals + " " + environment.std + " " + weights);
        }
    }
    
}

