import { Result } from "../results/results";
import { Contest } from "./contest";

import * as fs from 'fs';

export type PresidentialContestsName = "Alabama" | "Alaska" | "Arizona" | "Arkansas" | "California" | "Colorado" | "Connecticut" | "Delaware" | "District of Columbia" | "Florida" | "Georgia" | "Hawaii" | "Idaho" | "Illinois" | "Indiana" | "Iowa" | "Kansas" | "Kentucky" | "Louisiana" | "Maine At Large" | "Maine 1st" | "Maine 2nd" | "Maryland" | "Massachusetts" | "Michigan" | "Minnesota" | "Mississippi" | "Missouri" | "Montana" | "Nebraska At Large" | "Nebraska 1st" | "Nebraska 2nd" | "Nebraska 3rd" | "Nevada" | "New Hampshire" | "New Jersey" | "New Mexico" | "New York" | "North Carolina" | "North Dakota" | "Ohio" | "Oklahoma" | "Oregon" | "Pennsylvania" | "Rhode Island" | "South Carolina" | "South Dakota" | "Tennessee" | "Texas" | "Utah" | "Vermont" | "Virginia" | "Washington" | "West Virginia" | "Wisconsin" | "Wyoming";


export interface PresidentialContest extends Contest{
    name: PresidentialContestsName;

    pastElections: [Result, Result];
}


export class PresidentialElection extends Map<PresidentialContestsName, PresidentialContest>{



    constructor(){
        super();
        
        const pastResults = PresidentialElection.readPastResults();
        
        for (const pastResult of pastResults){
            this.set(pastResult.name, pastResult);
        }        
    }

    static readPastResults(): PresidentialContest[]{

        let presidentialContests: PresidentialContest[] = [];

        const fileData = fs.readFileSync("../data/past_presidential.csv").toString().split("\n");
        
        for(let i=0; i<fileData.length; i++){
            if (i==0){continue;}

            let stateData = fileData[i].split(",");
            
            const pastElections: Result[] = [];
            
            for (let j=0; j<2; j++){
                var dem = parseInt(stateData[7+j*3]);
                var rep = parseInt(stateData[8+j*3]);
                var total = parseInt(stateData[9+j*3]);                

                const result: Result = {
                    dem: dem / total,
                    rep: rep / total,

                    other: (total - dem - rep) / total,
                }

                pastElections.push(result);
            }

            presidentialContests.push({name: stateData[0] as PresidentialContestsName, pastElections: pastElections as [Result, Result], polls: []});
        }


        return presidentialContests;


    }
}