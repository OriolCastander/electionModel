/**
 * Pollster object. A pollster has a unique name and a couple of biases.
 * Past bias is how they performed in past elections.
 * Live bias (to implement) is concerned with their current bias against the "pollster mean"
 */

import pastPolls from "../../data/past_polls.json";


export interface Pollster {
    
    /** The unique name of the pollster */
    name: string;

    /** Bias exibited in past polls */
    pastBias: number;
    
}


export interface PollsterPredictionConfig{
    
    /** How much to correct a poll from a biased (in the past) pollster. a 1 will shift the poll by the observed bias, a 0 will not */
    pastBiasFactor: number;
}



/**
 * Loads the pollsters from which we have past polls, with their bisases
 */
export const loadPollsters = () : Map<string, Pollster> =>{

    const map: Map<string, Pollster> = new Map();

    

    type PossibleContests = "President" | "House" | "Senate";
    const results: {constest: PossibleContests, target: "", rep: number, dem: number}[] = [];

    const pollstersErrors: Map<string, number[]> = new Map();

    for (let pass of ["results", "polls"]){
        for (const data of pastPolls){

    
            const contest: PossibleContests = data.Contest as PossibleContests;
            const target: "" = ""; //data.Target as "";
            const dem =  data.Dem / 100;
            const rep = data.Rep / 100;
            
            if (pass == "results" && data.Pollster == "RESULT"){
                results.push({constest: contest, target: target, dem: dem, rep: rep});
            }

            else if (pass == "polls" && data.Pollster != "RESULT"){
                var validRace = false;
                for (const result of results){
                    if (result.constest == contest && result.target == target){
                        validRace = true;
                        const bias = (dem - rep) - (result.dem - result.rep);

                        if (pollstersErrors.has(data.Pollster)){pollstersErrors.get(data.Pollster)!.push(bias);}
                        else{pollstersErrors.set(data.Pollster, [bias]);}
                    }
                }

                if (!validRace){throw new Error("Past poll of unidentified result");}

            }
            
        }
    }

    for (const [pollsterName, pollsterErrors] of pollstersErrors.entries()){
        map.set(pollsterName, {name: pollsterName, pastBias: pollsterErrors.reduce((acc, val) => acc + val, 0.0) / pollsterErrors.length});
    }  

    return map;
}