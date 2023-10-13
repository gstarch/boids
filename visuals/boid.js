"use strict";
class Boid {

    constructor(x, y) {

        //vectors and orientation
        if ((typeof x === 'number') && (typeof y === 'number')) {
            this.pos = createVector(x, y);
        } else {
            this.pos = createVector(random(-width / 2, width / 2), random(-height / 2, height / 2));
        }
        this.vel = createVector(random(-1, 1), random(-1, 1));
        this.vel.setMag(random(7, 10));
        this.acc = createVector(0, 0);
        this.heading = this.vel.heading() + PI/2;

        //properties
        this.type = "boid";
        this.size = random(5, 50);
        this.maxSize = 100;
        this.life = random(40, 100);
        this.color = {
            hue: random(200, 220),
            sat: 100,
            brt: 100
        }

        //behaviour
        this.maxSpeed = this.getSpeed(this.size);
        this.maxForce = 20 / this.size;
        this.separationDistance = 20; //distance to separate others
        this.alignmentDistance = 50; //distance to align with others
        this.killBoid = false;
        this.bufferZone = 350;
        this.bounds = {
            xMin: -width / 2 + this.bufferZone,
            yMin: -height / 2 + this.bufferZone,
            xMax: width / 2 - this.bufferZone,
            yMax: height / 2 - this.bufferZone
        }
    }

    //draws a boid to the screen
    draw() {

        push(); //creates new screen config on stack

        //fade boids based on life remaining
        let fade = map(this.life, 0, 10, 0, 1);

        //fill(this.color.hue,this.color.sat, this.color.brt*fade);
        stroke(this.color.hue, this.color.sat * fade, this.color.brt * fade, fade);
        noFill();

        //translate and rotate canvas to prepare for drawing
        translate(this.pos.x, this.pos.y);
        rotate(this.heading);


        //draw triangular boid shape
        beginShape();
        vertex(0, -this.size / 3);
        vertex(-this.size / 5, this.size / 4);
        vertex(0, this.size / 8);
        vertex(this.size / 5, this.size / 4);
        endShape(CLOSE);

        pop(); //revert to previous screen config
    }

    //updates boid vectors and behaviour
    update(behaviour, output) {
        this.color.hue += 0.2;
        this.color.hue = this.color.hue % 360;

        //update new max speed based on new size
        this.maxSpeed = this.getSpeed(this.size);

        //align boid with velocity vector and correct orientation
        this.heading = this.vel.heading() + PI/2;

        //apply behaviours
        if (behaviour != null) {
            this.separate(behaviour.separationStrength);
            this.align(behaviour.alignmentStrength);
            this.cohere(behaviour.cohesionStrength);
        }

        //update vectors
        this.vel.add(this.acc); //update velocity with acceleration
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel); //update position with velocity      

        this.grow(0.02);
        this.age(0.1);

        //apply boundary behaviour
        this.constrain(this.bounds, 0.3);
        this.seek(createVector(0, 0), 0.1); //seek center of screen
    }

    //applies a force to the boid
    applyForce = (force) => {
        this.acc.add(force);
    }

    //applies a steering force away from other boids
    separate = function (strength) {

        let steerVector = createVector(0, 0);
        let count = 0;
        for (let i = 0; i < boids.length; i++) {
            let distance = p5.Vector.dist(this.pos, boids[i].pos);

            if ((distance < this.separationDistance) && (distance > 0)) {
                //calculate vector away
                let awayVector = p5.Vector.sub(this.pos, boids[i].pos);
                awayVector.normalize();
                if (boids[i].isPredator) awayVector.mult(500);
                awayVector.div(distance); //closer boids take higher priority
                steerVector.add(awayVector);
                count++;
            }
        }
        //average the steer vector
        if (count > 0) steerVector.div(count);

        //normalize and adjust the magnitude of the steer vector
        if (steerVector.magSq() > 0) { // magSq() is more performant than mag()
            steerVector.setMag(this.maxSpeed);
            steerVector.sub(this.vel); //Reynolds (1986): STEER = DESIRED_VELOCITY - CURRENT_VELOCITY
            steerVector.limit(this.maxForce * strength);
        }

        //apply the steering force
        this.applyForce(steerVector);
    }

    //applies a steering force to align with average direction of boids in local group
    align = function (strength) {

        let direction = createVector(0, 0);
        let count = 0;

        for (let i = 0; i < boids.length; i++) {
            let distance = p5.Vector.dist(this.pos, boids[i].pos);

            if ((distance < this.alignmentDistance) && (distance > 0)) {
                direction.add(boids[i].vel);
                count++;
            }
        }

        if (count > 0) {
            direction.div(count);
            direction.setMag(this.maxSpeed);
            let steerVector = p5.Vector.sub(direction, this.velocity);
            steerVector.limit(this.maxForce * strength);
            this.applyForce(steerVector);
        }

    }

    //applies a steering force to average location of its local group
    cohere = function (strength) {

        let groupPosition = createVector(0, 0);
        let count = 0;

        for (let i = 0; i < boids.length; i++) {

            if (this.type != boids[i].type) continue; // only cohere to own type

            let distance = p5.Vector.dist(this.pos, boids[i].pos);
            if ((distance < this.alignmentDistance) && (distance > 0)) {
                groupPosition.add(boids[i].pos);
                count++;
            }
        }

        if (count > 0) {
            groupPosition.div(count);
            groupPosition.setMag(this.maxSpeed / 5); //this division of speed is an arbitrary number to balance the size of the behaviour in relation to the others. It allows more balanced inputs through the "strength" parameter.
            let steerVector = p5.Vector.sub(groupPosition, this.vel); //Reynolds (1986): STEER = DESIRED_VELOCITY - CURRENT_VELOCITY
            steerVector.limit(this.maxForce * strength);
            this.applyForce(steerVector);
        }

    }

    //applies seeking behaviour towards vector position
    seek = (target2D, strength) => {
        let desiredVel = p5.Vector.sub(target2D, this.pos);
        desiredVel.setMag(this.maxSpeed);
        let steerVector = p5.Vector.sub(desiredVel, this.vel);
        steerVector.limit(this.maxForce * strength);
        this.applyForce(steerVector);

    }

    //returns boid to bounded area with steering force
    constrain = (bounds, strength) => {

        let desiredVel;

        if ((this.pos.x < bounds.xMin)) {
            desiredVel = createVector(this.maxSpeed, this.vel.y);
        } else if ((this.pos.x > bounds.xMax)) {
            desiredVel = createVector(-this.maxSpeed, this.vel.y);
        }
        if (desiredVel) {
            let steerVector = p5.Vector.sub(desiredVel, this.vel);
            steerVector.limit(this.maxForce * strength);
            this.applyForce(steerVector);
        }

        if ((this.pos.y < bounds.yMin)) {
            desiredVel = createVector(this.vel.x, this.maxSpeed);
        } else if ((this.pos.y > bounds.yMax)) {
            desiredVel = createVector(this.vel.x, -this.maxSpeed);
        }
        if (desiredVel) {
            let steerVector = p5.Vector.sub(desiredVel, this.vel);
            steerVector.limit(this.maxForce * strength);
            this.applyForce(steerVector);
        }

    }

    //function that makes boid grow in size 
    grow = (growthRate) => {
        if (this.size < this.maxSize) this.size += growthRate;
    }

    //function that makes boid age and die
    age = (ageRate) => {
        if (this.life > 0) {
            this.life -= ageRate;
        } else {
            //prepare boid for the afterlife
            this.killBoid = true;
        }
    }

    //function: maps current size to speed. (Larger boids have joint issues and move slower.)
    getSpeed = (size) => {
        //speed band can be modified to achieve desired flock behaviour
        let minSize = 2;
        let minSpeed = 4;
        let maxSpeed = 7;

        let speed = map(size, minSize, this.maxSize, maxSpeed, minSpeed);
        return speed;
    }
}
