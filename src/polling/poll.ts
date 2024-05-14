/**
 * Base poll object
 */

import { Pollster } from "../pollster/pollster";
import { Result } from "../utils/results";


export interface Poll{

    /** Reference to the pollster of the poll */
    pollster: Pollster,

    date: Date,

    generalResult: Result,

}