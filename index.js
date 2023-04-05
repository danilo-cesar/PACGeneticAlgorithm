'use strict';

function random(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min)) + min;
}

function getCombination(combinators, parcels) {
  let value = 0;
  value = { penetration: 0, viscosity: 0 };

  let total = combinators.reduce((sum, a) => sum + a, 0);
  //console.log("cotas: ", combinators, " total:", total);
  let IVmix = 0;
  let LogSum = 0;
  for (let i = 0; i < parcels.length; i += 1) {
    let vis = parcels[i].viscosity;
    let pen = parcels[i].penetration;
    let factor = (combinators[i] / total);

    //Viscosity composition calc
    let chevron = Math.log(vis) / Math.log(vis * 1000)
    IVmix += factor * chevron;

    // Penetration composition calc
    let penLog = (combinators[i] === 0) ? 1 : Math.log10(pen);
    LogSum += factor * penLog;
  }
  value.viscosity = Math.exp(IVmix * Math.log(1000) / (1 - IVmix));
  value.penetration = Math.pow(10, LogSum);
  return value;
}


function generateQuantityInNormalizedRange(instance, total) {
  let size = instance.length;
  let quantities = [];
  let zeros = [];
  let emptySpace = 0;
  for (let i = 0; i < size; i += 1) {
    if (instance[i].volume != "*") {
      //Contém marcador de volume fixo?
      let iSteady = instance[i].volume.toString().indexOf("!");
      if (iSteady != -1)//Sim, considerar volume fixo
        quantities.push(parseInt(instance[i].volume.toString().substring(0, iSteady)));
      else//Não. Considerar o volume como limite da corrente
        quantities.push(random(0, instance[i].volume));
    }
    else {
      quantities.push(0);
      zeros.push(i);
    }
  }

  // Randomize zeros array
  zeros = (zeros.length > 1) ? Shuffle(zeros) : zeros;
  let diff = total - quantities.reduce((sum, a) => sum + a, 0);
  while (zeros.length > 1) {
    let index = zeros.length - 1;
    emptySpace = total - quantities.reduce((sum, a) => sum + a, 0);
    //sortear o índice do array com as posições das correntes variáveis

    quantities[zeros[index]] = random(0, emptySpace);
    diff = emptySpace - quantities[zeros[index]];
    //console.log("es:", emptySpace, " rand:", quantities[index], " dif:",diff);
    zeros.splice(index, 1);
  }

  quantities[zeros[0]] = diff;//total - quantities.reduce((sum, a) => sum + a,0);
  //console.log(zeros.length, " - Quantities: ", quantities);
  // console.log('quantities: ', quantities, ' -> total: ', total);
  return quantities;
}

/**
 * Shuffle array (randomize) by Fisher–Yates algorithm
 */
function Shuffle(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

class Member {
  /*parameters:
    target = object{penetration:value, viscosity:value, volume:value}
    parcels = array ({penetration:value, viscosity:value, volume:value}, ... )
  */

  constructor(target, parcels) {
    this.target = target;
    this.candidates = 0;
    if (parcels != undefined || parcels != null)
      this.parcels = parcels;
    else
      this.parcels = [];
    //this.combinators = [];//manipulador a ser evoluído
    this.combinators = generateQuantityInNormalizedRange(this.parcels, this.target.volume);

    let value = getCombination(this.combinators, this.parcels);
    //console.log( "combinator:", this.combinators, 'values: ', value);
    this.value = value;
    let comb = this.combinators.map(function(item, index) { return parcels[index].name + ":" + item });
    this.label = comb.reduce((sum, a) => sum + a + ' | ', '');;
  }
  //Aporta critérios para dar vantagem reprodutiva aos pais mais adaptados
  fitness() {
    let matches = 0;
    this.candidates++;
    //Descomentar para mostrar todos os indivíduos gerados
    //console.log("valores: ", this.value);
    let minPen = this.value.penetration / this.target.penetration.min;
    let minVis = this.value.viscosity / this.target.viscosity.min;
    let maxPen = this.value.penetration / this.target.penetration.max;
    let maxVis = this.value.viscosity / this.target.viscosity.max;
    let refPen = (this.target.penetration.min + 3) / this.target.penetration.min;
    let refVis = (this.target.viscosity.min + 3) / this.target.viscosity.min;
    if (minPen > 1 && minVis > 1 && minPen < refPen && minVis < refVis)
      matches = 1;
    else if (minPen > 1 && minVis > 1 && (minPen >= refPen || minVis >= refVis))
      matches = 0.67;
    else if (minPen < 0.3 || minVis < 0.3)
      matches = 0;
    else
      matches = Math.min(minPen, minVis);

    return matches;
  }

  crossover(partner) {
    const { length } = this.parcels;
    const child = new Member(this.target, this.parcels);
    const midpoint = random(0, length);

    for (let i = 0; i < length; i += 1) {
      if (i > midpoint) {
        child.combinators[i] = this.combinators[i];
      } else {
        child.combinators[i] = partner.combinators[i];
      }
    }

    return child;
  }

  mutate(mutationRate) {
    if (Math.random() < mutationRate) {
      this.combinators = generateQuantityInNormalizedRange(this.parcels, this.target.volume);
    }
  }
}

class Population {
  constructor(size, target, parcels, mutationRate) {
    size = size || 1;
    this.members = [];
    this.genIterations = 0;
    this.mutationRate = mutationRate;

    for (let i = 0; i < size; i += 1) {
      this.members.push(new Member(target, parcels));
    }
  }

  evolve(generations) {
    for (let i = 0; i < generations; i += 1) {
      const pool = this._selectMembersForMating();
      this._reproduce(pool);
    }
  }

  _selectMembersForMating() {
    const matingPool = [];

    this.members.forEach((m) => {
      // The fitter he/she is, the more often will be present in the mating pool
      // i.e. increasing the chances of selection
      // If fitness == 0, add just one member
      const f = Math.floor(m.fitness() * 100) || 1;
      this.genIterations += m.candidates;
      for (let i = 0; i < f; i += 1) {
        matingPool.push(m);
      }
    });

    return matingPool;
  }

  _reproduce(matingPool) {
    for (let i = 0; i < this.members.length; i += 1) {
      // Pick 2 random members/parent from the mating pool
      const parentA = matingPool[random(0, matingPool.length)];
      const parentB = matingPool[random(0, matingPool.length)];

      // Perform crossover
      const child = parentA.crossover(parentB);

      // Perform mutation
      child.mutate(this.mutationRate);

      this.members[i] = child;
    }
  }
}

// Init function
function generate(populationSize, target, parcels, mutationRate, generations) {
  // Create a population and evolve for N generations
  const population = new Population(populationSize, target, parcels, mutationRate);
  population.evolve(generations);

  // Get the typed words from all members and find if someone was able to type the target
  const membersKeys = population.members.map((m) => Math.floor(m.value.penetration) + "::" + Math.floor(m.value.viscosity));
  const mk = population.members.map((m) => [m.value.penetration, m.value.viscosity, m.label]);

  const perfectCandidatesNum = mk.filter((w) => w[0] > target.penetration.min && w[1] > target.viscosity.min);

  // Print the results
  console.log(membersKeys, perfectCandidatesNum);
  console.log(`${perfectCandidatesNum ? perfectCandidatesNum.length : 0} The best formulations were selected from a population of ${population.genIterations} candidates and fulfill the following conditions: "${JSON.stringify(target)}"`);
}
