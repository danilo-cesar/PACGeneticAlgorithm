# PACGeneticAlgorithm
Genetic Algorithtm to formulate Petroleum Asphalt Cement

Use example: call the main function generate(..)

generate(
  50, //Initial population
  /*
  * Desired properties and its specified range values
  * See more about these properties on <https://onlinepubs.trb.org/Onlinepubs/hrr/1972/404/404-010.pdf>
  */
  {
    penetration: { min: 50, max: 60 }, // in this case the penatration desired is between 50-60 [(0.1mm)/(second)]
    viscosity: { min: 57, max: 60 }, // in this case the cinematic viscosity is between 57-60 [cP]
    volume: 56000 // in this case the desired volume of final compositions is 5000 [mˆ3]
  },
  /*
  * Array of Components to participate evaluation (streams, stocks, volumes, portions, etc)
  * Object i_Element{name: "String Name", penetration: number, viscosity: number, volume:"String"}
  * Participation mode - volume propertie
  * The volume propertie is a posfixed string number in form '####?', where # is a number to specify the 
  * volume (mˆ3) or volumetric flow (mˆ3/h) and ? define de participation mode:
  * (*) - No specified quantity
  * (###!) - The quantity ### be static in evaluations (used when need use whole volume of one specified stock) 
  * (###) - The quantity was been evaluate in interval [0 to ###] by algorithm
  * Above has a array composition to be evaluate on production of PAC in Tank A 
  */
  [
    { name: "Tank A Ballast", penetration: 47, viscosity: 68, volume: '2000!' },
    {name:"Tank B", penetration:50, viscosity:58, volume:'808!'},
    {name: "Stream of Unit A", penetration: 44, viscosity: 70, volume: '*' },
    { name: "Tank C - fixing stock", penetration: 10000000, viscosity: 2, volume: '100' }
  ],
  0.05, // Mutation Rate
  100
);
