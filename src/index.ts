import { PresidentialElection } from "./contests/presidentialElection";
import { Pollster } from "./polling/pollster";


const POLLSTERS = new Map<string, Pollster>();

POLLSTERS.set("You Gov", {name: "You Gov", bias: 0.01});
POLLSTERS.set("Fox News", {name: "Fox News", bias: -0.012});

const presidential = new PresidentialElection();

