

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

//rendering
function setPixel(x, y, r, g, b, a = 255) {
    const imageData = ctx.createImageData(1, 1);
    const data = imageData.data;

    data[0] = r;
    data[1] = g;
    data[2] = b;
    data[3] = a;

    ctx.putImageData(imageData, x, y);
}

function render(){

        //constants
        const smoothness = document.getElementById('Smoothness').value;
        const saturation = document.getElementById('Saturation').value;;
        const lineThickness = document.getElementById('Thickness').value;;


        //draw field
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const buffer = imageData.data;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                
                let totalField = 0;
                
                world.forEach(obj => {


                    let dist = Math.sqrt((obj.x -x) ** 2 + (obj.y-y) ** 2);
                    
                    totalField += obj.charge/dist * (8.99E2);
    
                });

                const idx = (y * canvas.width + x) * 4;
                let r,g,b = 0;

                // if (totalField >= 0){
                //     r = Math.abs(totalField);
                //     g = 0;
                // }else{
                //     g = Math.abs(totalField);
                //     r = 0;
                // }
                
                if(Math.abs(totalField % smoothness )< lineThickness){
                    if (totalField > 0){
                        r = Math.abs(totalField) * saturation;
                        g = 0;
                    }else if (totalField < 0){
                        g = Math.abs(totalField) * saturation;
                        r = 0;
                    }
                }

                // if(totalField < 1 && totalField > -1){
                //     b = 255;
                //     r = 0;
                //     g = 0;
                // }
                
                
                
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
let world = [new ChargedObject(canvas.width/2 - 200,canvas.height/2,50,3), new ChargedObject(canvas.width/2 + 200,canvas.height/2,50,-3)]

document.addEventListener("mousemove", function (event) {
      world.forEach(obj => {
        if(obj.held){
            obj.x = event.clientX;
            obj.y = event.clientY;
        }
    });
});

canvas.addEventListener("click", function (event) {
      world.forEach(obj => {
        
        let dist = Math.sqrt((obj.x - event.clientX)**2 + (obj.y - event.clientY) ** 2)
        if(dist < obj.r){
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

    radius = parseInt(window.prompt("What is the radius of the object? (base is 50)"));
    while (isNaN(radius)){
        radius = parseInt(window.prompt("What is the radius of the object? (base is 50)"))
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


function main(){
    render()
}
setInterval(main, 16.67);









// main()