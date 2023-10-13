let boids = [];
let maxBoids;

function Boids() {
  this.name = "Boids";

  this.setup = () => {
    boids = [];
    maxBoids = 200;
    addBoids(70, Boid);
    angleMode(RADIANS);
  };

  this.draw = (output) => {
    push();
    translate(width / 2, height / 2);
    background(0);

    // magic numbers to balance flocking forces: {0.2, 1, 0.8}
    let behaviour = {
      separationStrength: 0.2,
      alignmentStrength: 1,
      cohesionStrength: 0.8,
    };

    for (let i = 0; i < boids.length; i++) {
      boids[i].update(behaviour, output);
      boids[i].draw();

      if (boids[i].killBoid) {
        killBoid(i);
      }
    }

    if (boids.length < maxBoids - 1) addBoids(floor(random(10)), Boid);

    pop();
  };

  this.setup();
}

function addBoids(n) {
  for (let i = 0; i < n; i++) {
    boids.push(new Boid(0, 0));
  }
}

//destroys boid with index i
function killBoid(i) {
  boids.splice(i, 1);
}
