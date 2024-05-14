/**
 * Base constest object. A contest may be the popular vote, a state in the presidential election,
 * a senate or house race...
 */

import { Poll } from "../polling/poll";
import { Normal, addDeviation, constructNormal, randomNormal } from "../utils/normal";


export interface Contest {

    /** Name of the contest */
    name: string,

    /**
     * Difference between the contest population and the "base" vote
     * Used for example, to calculate state results with the popular vote
     */
    environment: Normal | null;

    /**
     * Predicted environment in 2024 using trends and extrapolation
     */
    predictedEnvironment: Normal | null;

    /** Polls of the Contest */
    polls: Poll[];

}



/**
 * Stuff to customize the prediction of a constest
 */
export interface ContestPredictionConfig {

    /** Info about the environment of the contest and how it should be taken into account */
    environment?: ContestPredictionEnvironment;

    /** 
     * "Fixed" random result. Amount of stds that the result should be shifted from mean instead of taking
     * a random normal
     */
    favorability?: number;

    /**
     * Parameter passed into randomNormal() that shifts the reuslt
     */
    normalShift?: number;

}

export type ContestPredictionEnvironment = {
    /** Percent of the prediction that will be based on environment result */
    environmentPercentage: number;
} & ({/** Precomputed result of the environment */ result: number} | {
    /** The environment. Not needed if result is precalculated */
    environment: Contest;
    /** Fixed random result for the environment "randomness" */
    favorability?: number;
});

/**
 * Predicts a contest. Returns the dem advantage over rep in an instance of the contest
 * @param contest 
 * @param config 
 * @returns 
 */
export const predictContest = (contest: Contest, config: ContestPredictionConfig): number =>{

    
    if (!("environment" in config) && contest.polls.length == 0){
        //TODO: IF NO VALID POLLS
        throw new Error(`Cannot predict contest ${contest.name} if no polls available and not an environment`);
    }


    ///MEAN AND STANDARD DEVIATION OF DEM ADVANTAGE IN POLLS
    const pred = constructNormal(contest.polls.map(poll=>poll.generalResult.dem - poll.generalResult.rep));
    addDeviation(pred, .01);

    if ("environment" in config){

        //Get the result of doing the environment logic and insterting the result into pred.
        
        var environmentResult: number;
        if ("result" in config.environment!){
            environmentResult = config.environment.result;
        }else{
            environmentResult = predictContest(config.environment!.environment, {favorability: config.environment!.favorability ?? 0.0});
        }

        var contestEnvironmentShift: Normal;

        if (contest.predictedEnvironment != null){
            contestEnvironmentShift = contest.predictedEnvironment;
        }else if (contest.environment != null){
            contestEnvironmentShift = contest.environment;
        }else{
            throw new Error(`Environemment cannot be integrated into ${contest.name} if it is not defined`);
        }

        const result = environmentResult + randomNormal(contestEnvironmentShift);

        
        if (contest.polls.length == 0){
            //TODO: IF NO VALID POLLS
            pred.mean = result;
            pred.std = 0;

        }else{
            const envPer = config.environment!.environmentPercentage;
            pred.mean = result * envPer + pred.mean * (1 - envPer);
            pred.std = pred.std * (1 - envPer);
        }

        addDeviation(pred, contestEnvironmentShift.std);
    }
    



    if ("favorability" in config){
        return pred.mean + pred.std * config.favorability!;
    }else{
        var normalShift = config.normalShift ?? 0.0;
        return randomNormal(pred, normalShift);
    }

} 


