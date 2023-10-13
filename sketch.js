//store visualisations in a container
let vis = null;
let ctx;

setup = () => {

	//create a new canvas instance
	ctx = createCanvas(windowWidth, windowHeight);
	
	//general sketch settings
	imageMode(CENTER);
	colorMode(HSB);
	angleMode(RADIANS);
	background(0);

	//create a new visualisation container and add visualisations
	vis = new Visualisations();
	vis.add(new Boids()); //Boid flock

	//select a random visualisaion on load
	let selected = floor(random(vis.visuals.length));
	vis.selectVisual(vis.visuals[selected].name);
}

draw = () => {
	//create output object to pass to visualisations

	//draw the selected visualisation 
	vis.selectedVisual.draw(0);
}