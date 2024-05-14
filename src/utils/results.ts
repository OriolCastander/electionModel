/**
 * All about the results of the polls or the election itself.
 * Base result holds the dem, rep and other percentage
 */


export interface Result{
    /** Percentage of dem votes */
    dem: number,

    /** Percentage of rep votes */
    rep: number,

    /** Percentage of other votes */
    other: number,
}
