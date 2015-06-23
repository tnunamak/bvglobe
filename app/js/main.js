if(!Detector.webgl){
      Detector.addGetWebGLMessage();
    } else {

      var years = ['1990','1995','2000'];
      var container = document.getElementById('container');
      var globe = new DAT.Globe(container);

      console.log(globe);
      var i, tweens = [];

      var settime = function(globe, t) {
        return function() {
          new TWEEN.Tween(globe).to({
                time: t/3
              },500).easing(TWEEN.Easing.Cubic.EaseOut).start();
          // var y = document.getElementById('year'+years[t]);
          // if (y.getAttribute('class') === 'year active') {
          //   return;
          // }
          // var yy = document.getElementsByClassName('year');
          // for(i=0; i<yy.length; i++) {
          //   yy[i].setAttribute('class','year');
          // }
          // y.setAttribute('class', 'year active');
        };
      };

      // for(var i = 0; i<years.length; i++) {
      //   var y = document.getElementById('year'+years[i]);
      //   y.addEventListener('mouseover', settime(globe,i), false);
      // }

      var xhr;
      TWEEN.start();


      xhr = new XMLHttpRequest();
      xhr.open('GET', '/globe/data.json', true);
      xhr.onreadystatechange = function(e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            window.data = data;
            for (i=0;i<data.length;i++) {
              globe.addData(data[i][1], {format: 'magnitude', name: data[i][0], animated: true});
            }
            globe.createPoints();
            settime(globe,0)();
            globe.animate();
            document.body.style.backgroundImage = 'none'; // remove loading
            // beginRotation();
          }
        }
      };
      xhr.send(null);
    }
    function beginRotation () {
      globe.target.y = 0.3
      setInterval(function () {
        globe.target.x = globe.target.x + 0.0001;
      }, 1);
    }
    function changeData (x) {
      new TWEEN.Tween(globe).to({ time: x },500).easing(TWEEN.Easing.Cubic.EaseOut).start();
    }
// (function() {

// var scene, camera, renderer;
// var geometry, material, mesh;

// init();
// animate();

// function init() {

//     scene = new THREE.Scene();

//     camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
//     camera.position.z = 1000;

//     geometry = new THREE.BoxGeometry( 200, 200, 200 );
//     material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

//     mesh = new THREE.Mesh( geometry, material );
//     scene.add( mesh );

//     renderer = new THREE.WebGLRenderer();
//     renderer.setSize( window.innerWidth, window.innerHeight );

//     document.body.appendChild( renderer.domElement );

// }

// function animate() {

//     requestAnimationFrame( animate );

//     mesh.rotation.x += 0.01;
//     mesh.rotation.y += 0.02;

//     renderer.render( scene, camera );

// }

// })();
