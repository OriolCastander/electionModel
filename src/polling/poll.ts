import { Result } from "../results/results";
import { Pollster } from "./pollster";



export interface Poll{
    /** Reference to the pollster */
    pollster: Pollster;

    date: Date;

    mainResult: Result;
}

