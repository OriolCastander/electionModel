/**
 * All about normal distributions
 */


export interface Normal{
    mean: number,
    std: number,
}


export const constructNormal = (array: number[]): Normal => {

    const mean = array.reduce((acc, val) => acc + val, 0.0) / array.length;
    const diffsSquared = array.reduce((acc: number[], val) => acc.concat((val - mean) ** 2), [])
                                .reduce((acc, val)=>acc + val, 0);

    return {mean: mean, std: Math.sqrt(diffsSquared / array.length)}
}

/**
 * Constructs a normal from an array where each element has a specific weight (they needn't sum one)
 */
export const constructWeightedNormal = (array: number[], weights: number[]): Normal =>{
    if (array.length != weights.length){throw new Error("Array length and weights lenght should be equal when constructing normal");}
    
    const totalWeight = weights.reduce((acc, val) => acc + val, 0.0);
    const avgWeight = totalWeight / weights.length;
    const mean = array.reduce((acc, val, index) => { return acc + (val * weights[index] / totalWeight);}, 0.0);

    const diffsSquared = array.reduce((acc: number[], val, index) => acc.concat(((val - mean) ** 2) * weights[index] / avgWeight), []);
    const std = Math.sqrt(diffsSquared.reduce((acc, val) => acc + val, 0.0) / array.length);

    return {mean: mean, std: std};
}

/**
 * Inplace changes the std of the normal
 * @param normal 
 * @param deviation 
 */
export const addDeviation = (normal: Normal, deviation: number) : void =>{
    normal.std = Math.sqrt(normal.std ** 2 + deviation ** 2);
}



/**
 * Computes the probability of a random normal being smaller than value
 */
export const cdf = (normal: Normal, value: number): number =>{

    /**
    var z = (value - normal.mean) / (normal.std * Math.sqrt(2));
    const a1 = 0.48592; 
    const a2 = -1.14736; 
    const a3 = 2.52741; 
    const a4 = -1.45527; 
    const a5 = 4.256; 
    const A = 0.37711; 
    const s = (z < 0) ? -1 : 1; 
    z = Math.abs(z) / Math.sqrt(2.0); 
    const B = 1.0 / (1.0 + A * z); 
    const C = 1.0 - (((((a5 * B + a4) 
        * B + a3) * B + a2) * B + a1) * B) 
        * Math.exp(-z * z); 
    
    */

    var x = (value - normal.mean) / (normal.std * Math.sqrt(2));

    // save the sign of x
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // constants
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var p  =  0.3275911;

    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    var erf = sign * y; // erf(-x) = -erf(x);

    var res = .5 * (1 + erf);

    return res; 
}

/**
 * Get a random number normally distributed
 * @param normal The normal
 * @param shift Amount of stds that the value will be shifted
 * @returns 
 */
export const randomNormal = (normal: Normal, shift: number=0.0): number =>{
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    
    return (z + shift) * normal.std + normal.mean;
}