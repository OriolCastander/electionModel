/**
 * The presidential contest
 */


import { Normal, constructNormal, constructWeightedNormal, randomNormal } from "../utils/normal";
import { STATES } from "../utils/utils";
import { Contest, ContestPredictionConfig, predictContest } from "./contest";
import { Result } from '../utils/results';
import { PollsterPredictionConfig } from '../pollster/pollster';

import pastPresidential from "../../data/past_presidential.json";
import pastHouse from "../../data/past_house.json";


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


    ///LOAD THE PRESIDENTIAL AND HOUSE DATA
    const presidentialData = loadPastPresidentialData();
    const houseData = loadPastHouseStatewideData();

    for (const data of pastPresidential){
        var name: PresidentialContestsName = data.State as PresidentialContestsName; //TRY CATCH?
        var electors = data["Electoral Seats"];

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

    for (const data of pastPresidential){
        var name: PresidentialContestsName = data.State as PresidentialContestsName; //TRY CATCH?

        var pastResults: Map<number, Result> = new Map();
        for (const year of [2016, 2020]){
            var dem = data[(year + " Dem") as "2016 Dem"];
            var rep = data[(year + " Rep") as "2016 Dem"];
            var tot = data[(year + " Tot") as "2016 Dem"];


            var result: Result = {
                dem: dem,
                rep: rep,
                other: (tot - rep - dem),
            }

            pastResults.set(year, result);
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


    for (const data of pastHouse){

        var pastResults: Map<number, Result> = new Map();
        for (const year of [2016, 2018, 2020, 2022]){
            var dem = data[(year + " Dem") as "2016 Dem"];
            var rep = data[(year + " Rep") as "2016 Dem"];
            var tot = data[(year + " Tot") as "2016 Dem"];


            var result: Result = {
                dem: dem,
                rep: rep,
                other: (tot - rep - dem),
            }

            pastResults.set(year, result);
        }

        pastResultsByState.set(data.State as PresidentialContestsName, pastResults);
    }

    return pastResultsByState;
    
}



////PREDICTIONS


export interface PresidentialRacePredictionConfig {

    environmentsConfig?: PresidentialRacePredictionEnvironmentsConfig;

    pollstersConfig?: PollsterPredictionConfig;
}

/**
 * Deals with configs when determining each state environment (difference from the popular vote)
 */
interface PresidentialRacePredictionEnvironmentsConfig{
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

    if (config == null){config = {};}

    if (!config.environmentsConfig){
        config.environmentsConfig = {popularVoteFactor: .7, recencyFactor: .3, houseToPresidentialRatio: .3};
    }

    if (!config.pollstersConfig){
        config.pollstersConfig = {pastBiasFactor: .5};
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

        var popularVoteResult = predictContest(presidentialRace.popularVote, {pollstersConfig: config.pollstersConfig!, normalShift: secenarioFavorability});

        var demElectors = 0;
        const predictionConfig: ContestPredictionConfig = {
            environment: {
                environmentPercentage: .5,
                result: popularVoteResult,
            }
        };

        for (const contest of presidentialRace.contests.values()){

            var contestShift = randomNormal({mean:0.0, std:1.0}) * randomNormal(contest.environment!);
            var contestFavorability = secenarioFavorability + contestShift;

            var constestResult = predictContest(contest, {...predictionConfig, normalShift: contestFavorability});
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

            if (stateName.includes("1st") || stateName.includes("2nd") || stateName.includes("3rd")){continue;} //TO TOTAL, COUNT ONLY NE AND ME AT LARGE
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

            return oldFactor * (1 - config.environmentsConfig!.recencyFactor) + config.environmentsConfig!.recencyFactor;
        }

        //ENVIRONMENT (WEIGHTED MEAN OF PAST RESULTS)
        const vals = [];
        const weights = [];

        for (const year of [2016, 2020]){
            const res = contest.pastPresidentialResults.get(year)!;
            const totalVotes = res.dem + res.rep + res.other;

            const margin = (res.dem - res.rep) / totalVotes;
            const shifedMargin = margin - presidentialPopularVoteMargins.get(year)!;
            vals.push(margin * (1 - config.environmentsConfig!.popularVoteFactor) + shifedMargin * config.environmentsConfig!.popularVoteFactor);
            weights.push(getYearWeightFactor(year, true));
        }

        if (contest.pastHouseStatewideResults != null){
            for (const year of [2016, 2018, 2020, 2022]){
                const res = contest.pastHouseStatewideResults.get(year)!;
                const totalVotes = res.dem + res.rep + res.other;
    
                const margin = (res.dem - res.rep) / totalVotes;
                const shifedMargin = margin - housePopularVoteMargins.get(year)!;
                vals.push(margin * (1 - config.environmentsConfig!.popularVoteFactor) + shifedMargin * config.environmentsConfig!.popularVoteFactor);
                weights.push(getYearWeightFactor(year, false) * config.environmentsConfig!.houseToPresidentialRatio / 2);
            }
        }

        const environment = constructWeightedNormal(vals, weights);
        contest.environment = environment;

        
    }
    
}

