/**
 * Pollster object. A pollster has a unique name and a couple of biases.
 * Past bias is how they performed in past elections.
 * Live bias (to implement) is concerned with their current bias against the "pollster mean"
 */


export interface Pollster {
    
    /** The unique name of the pollster */
    name: string;
    
}