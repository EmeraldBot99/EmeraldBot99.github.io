function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight-100;
}



class ChargedObject{
    constructor(x,y,r,charge, held = false){
        this.x = x;
        this.y = y;
        this.r = r;
        this.charge = charge;

        this.held = held;
    }
}

function calculateField(x,y){
    let totalField = 0;
    world.forEach(obj => {          


        let dist = Math.sqrt((obj.x -x) ** 2 + (obj.y-y) ** 2);
        totalField += obj.charge/dist * (8.99E2);
    });
    return totalField;
}

function render(){

        //constants
        const smoothness = document.getElementById('Smoothness').value;
        const saturation = document.getElementById('Saturation').value;
        const lineThickness = document.getElementById('Thickness').value;


        //draw field
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const buffer = imageData.data;


        
        for (let y = 0; y < canvas.height; y++) {
            const yOffset = y * canvas.width;
            for (let x = 0; x < canvas.width; x++) {
                
                let totalField = calculateField(x,y);
                const idx = (yOffset + x) << 2; 
                let r,g,b = 0;
                



                //lines present if thickess < smoothness    
                if(Math.abs(totalField % smoothness ** world.length )< lineThickness){
                    if (totalField > 0){
                        r = Math.log(Math.abs(totalField)) * saturation * 2;
                        g = 0;
                        b = 0;
                    }else if (totalField < 0){
                        g = Math.log(Math.abs(totalField)) * saturation * 2;
                        r = 0;
                        b = 0;
                    }
                }
                //draw grid
                if( (x % 100 <= 0.5 || y % 100 <= 0.5) && document.getElementById("gridLines").checked){
                    r,g,b = 255;
                }



                //rgba
                buffer[idx] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);


    world.forEach(obj => {
        //draw objects
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.r, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    });
}

//drag and drop
const canvas = document.getElementById('FieldVisualizer');
const ctx = canvas.getContext('2d');
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

//define list of ChargedObjects
let world = [new ChargedObject(canvas.width/2 - 200,canvas.height/2,25,3), new ChargedObject(canvas.width/2 + 200,canvas.height/2,25,-3)]

document.addEventListener("mousemove", function (event) {
    let textBox = document.getElementById("FieldValue");
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    world.forEach(obj => {
        if (obj.held) {
            obj.x = mx;
            obj.y = my;
            
            //snap to grid
            if (event.shiftKey) {
                const snapX = Math.round(mx / 100) * 100;
                const snapY = Math.round(my / 100) * 100;

                const dx = Math.abs(mx - snapX);
                const dy = Math.abs(my - snapY);

                if (dx < 30 && dy < 30) {   // 50px threshold
                    obj.x = snapX;
                    obj.y = snapY;
                    console.log("true");
                }
            }
        }
    });
    
    const fieldVal = calculateField(mx, my);
    textBox.innerText = "Field at mouse position is: " + (Number.isFinite(fieldVal) ? fieldVal.toFixed(3) : (fieldVal === Infinity ? "Infinity" : "N/A"));
});

canvas.addEventListener("click", function (event) {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    world.forEach(obj => {
        let dist = Math.sqrt((obj.x - mx) ** 2 + (obj.y - my) ** 2);
        if (dist < obj.r) {
            obj.held = !obj.held;
        }
    });
});

const actionButton = document.getElementById('AddNewButton');

actionButton.addEventListener("click", function (event){
    charge = parseInt(window.prompt("What is the charge on the object?"));
    while (isNaN(charge)){
        charge = parseInt(window.prompt("What is the charge on the object?"));
    }

    radius = parseInt(window.prompt("What is the radius of the object? (base is 25)"));
    while (isNaN(radius)){
        radius = parseInt(window.prompt("What is the radius of the object? (base is 25)"))
    }


    world.push(new ChargedObject(event.clientX,event.clientY, radius, charge, true));



});

const deleteButton = document.getElementById("DeleteButton");
deleteButton.addEventListener("click", function (event){
    let deleted = true;
    while(deleted){
        deleted = false;
        for(let i = 0; i < world.length; i++){
            if(world[i].held){
                world.splice(i,1);
                deleted = true;
            }
        }
    }

});

let lastTime = performance.now();
let fps = 0;
function main(){

    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;
    fps = 1000 / delta;

    render();

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("FPS: " + fps.toFixed(1), 10, 30);

    requestAnimationFrame(main);
}
// setInterval(main, 16.667);
requestAnimationFrame(main);