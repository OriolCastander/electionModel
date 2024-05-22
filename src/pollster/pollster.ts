/**
 * Pollster object. A pollster has a unique name and a couple of biases.
 * Past bias is how they performed in past elections.
 * Live bias (to implement) is concerned with their current bias against the "pollster mean"
 */


import * as fs from 'fs';



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

    const file = fs.readFileSync("./data/past_polls.csv");
    const data = file.toString("utf-8").split("\r\n");

    type PossibleContests = "President" | "House" | "Senate";
    const results: {constest: PossibleContests, target: "", rep: number, dem: number}[] = [];

    const pollstersErrors: Map<string, number[]> = new Map();

    for (let pass of ["results", "polls"]){
        for (let i=1; i<data.length; i++){
            const stuff = data[i].split(",");

    
            const contest: PossibleContests = stuff[2] as PossibleContests;
            const target: "" = stuff[3] as "";
            const dem =  parseFloat(stuff[4]) / 100;
            const rep = parseFloat(stuff[5]) / 100;
            
            if (pass == "results" && stuff[0] == "RESULT"){
                results.push({constest: contest, target: target, dem: dem, rep: rep});
            }

            else if (pass == "polls" && stuff[0] != "RESULT"){
                var validRace = false;
                for (const result of results){
                    if (result.constest == contest && result.target == target){
                        validRace = true;
                        const bias = (dem - rep) - (result.dem - result.rep);

                        if (pollstersErrors.has(stuff[0])){pollstersErrors.get(stuff[0])!.push(bias);}
                        else{pollstersErrors.set(stuff[0], [bias]);}
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