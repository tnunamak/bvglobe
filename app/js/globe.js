/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var DAT = DAT || {};

DAT.Globe = function(container, options) {
  var opts = options || {};

  opts.atmosphereScale = opts.atmosphereScale || 1.09;

  var colorFn = opts.colorFn || function(x) {
    var c = new THREE.Color();
    var minHue = 0.2;
    var maxHue = 0.5;
    var hue = Math.min(1, minHue + (x * (maxHue - minHue)));
    var saturation = 0.7;
    var lightness = 0.5;
    c.setHSL(hue, saturation, lightness);

    return c;
  };

  var imgDir = opts.imgDir || 'globe';

  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
          'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  var camera, scene, renderer, w, h;
  var atmosphereMesh, atmosphere;
  var overRenderer;

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var startX = 3.5;
  var startY = 0.3;
  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: startX, y: startY },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  function init() {
    var earthGeometry = new THREE.SphereGeometry(200, 40, 30);

    scene = new THREE.Scene();

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
    camera.position.z = distance;

    addEarth(scene);
    atmosphereMesh = addAtmosphere(scene);
    addStars(scene);
    addSunlight(scene);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(w, h);

    renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);

    container.addEventListener('mousedown', onMouseDown, false);

    container.addEventListener('mousewheel', onMouseWheel, false);

    document.addEventListener('keydown', onDocumentKeyDown, false);

    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);

    target.y = startY;
    target.x = startX;

    // Allow resize of window.
    window.addEventListener( 'resize', onWindowResize, false );
    function onWindowResize(){
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function addEarth(scene) {
      var shader = Shaders['earth'];
      var uniforms = THREE.UniformsUtils.clone(shader.uniforms);

      uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir+'/world-blue.jpg');

      var material = new THREE.MeshLambertMaterial({
        map: THREE.ImageUtils.loadTexture(imgDir+'/world-blue.jpg')
      });

      var mesh = new THREE.Mesh(earthGeometry, material);
      mesh.rotation.y = Math.PI;
      scene.add(mesh);

      function drawGMT() {
        window.globe.addData([{latitude: 11, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 21, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 31, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 41, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 61, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 71, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 81, longitude: 0, count: .3, color: colorFn(.3)}]);
        window.globe.addData([{latitude: 91, longitude: 0, count: .3, color: colorFn(.3)}]);
      }

      // setInterval(drawGMT, 500);
    }

    function addAtmosphere(scene) {
      var shader = Shaders['atmosphere'];
      var uniforms = THREE.UniformsUtils.clone(shader.uniforms);

      var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });

      var mesh = new THREE.Mesh(earthGeometry, material);
      mesh.scale.set(opts.atmosphereScale, opts.atmosphereScale, opts.atmosphereScale);
      scene.add(mesh);
      return mesh;
    }

    function addStars(scene) {
      // create the geometry sphere
      var geometry = new THREE.SphereGeometry(1000, 16, 16)

      // create the material, using a texture of starfield
      var material = new THREE.MeshBasicMaterial()
      material.map = THREE.ImageUtils.loadTexture(imgDir + '/galaxy_starfield.png')
      material.side = THREE.BackSide

      // create the mesh based on geometry and material
      var mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh);
    }

    function addSunlight(scene) {
     var light = new THREE.DirectionalLight(0xffffff, 1);

      updateSunlight();
      setInterval(updateSunlight, 10000);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x666666));

      function updateSunlight () {
        var angleAtMidnight = (0 * Math.PI / 180);

        var d = new Date();
        var startOfDayGmt = new Date().setHours(0,0,0,0) - (d.getTimezoneOffset() * 60000);
        var timeElapsed = d.getTime() - startOfDayGmt;

        var millisPerDay = 24 * 60 * 60 * 1000;
        var percentDayElapsed = timeElapsed / millisPerDay;

        sunAngle = (2 * Math.PI * percentDayElapsed) + angleAtMidnight;

        light.position.set(Math.cos(sunAngle), 0, Math.sin(sunAngle));
      }
    }
  }

  function addData(data) {
    var lat, lng, size, color;

    for (var i = 0; i < data.length; i++) {
      lat = data[i].latitude;
      lng = data[i].longitude;
      size = data[i].count;
      color = colorFn(size);

      addPoint(lat, lng, size * 200, color);
    }
  };

  function addPoint(lat, lng, size, color) {
    var eject;
    var zSize = Math.max( size / 2, 0.1 ); // avoid non-invertible matrix

    var pointName = 'point_'+lat+'_'+lng;
    var point = _.find(scene.children, function (child) {
      if (child.name === pointName) {
        child.scale.z = zSize;
        return true;
      }
    });

    if (point) {
      return;
    }

    var geometry = new THREE.BoxGeometry(0.75, 0.75, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-0.5));
    var point = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                  color: 0xffffff,
                  vertexColors: THREE.FaceColors,
                  morphTargets: false
                }));
    point.name = pointName;
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    point.position.y = 200 * Math.cos(phi);
    point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    point.lookAt(atmosphereMesh.position);

    point.scale.z = zSize;
    point.updateMatrix();

    for (var i = 0; i < point.geometry.faces.length; i++) {
      point.geometry.faces[i].color = color;
    }
    if(point.matrixAutoUpdate){
      point.updateMatrix();
    }

    // store references to each point
    scene.add(point);
  }

  function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseMove(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance/1000;

    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseUp(event) {
    target.y = startY;
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize( event ) {
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( container.offsetWidth, container.offsetHeight );
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  function render() {
    var rotationalSpeed = 0.0005;

    if(opts.rotate) {
      target.x -= rotationalSpeed;
    }

    for (var i = 0; i < scene.children.length; i++) {
      // loop through and decay each point
      if (scene.children[i] && scene.children[i].name.indexOf('point') === 0) {
        // shrink/decay at this point
        scene.children[i].scale.z *= .99;

        if(scene.children[i].scale.z < .5) {
          // TODO profile the app to make sure there's no memory leak
          scene.remove(scene.children[i]);
        }
      }
    }

    zoom(curZoomSpeed);

    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;

    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

    camera.lookAt(atmosphereMesh.position);

    renderer.render(scene, camera);
  }

  init();
  this.animate = animate;
  this.addData = addData;
  this.renderer = renderer;
  this.scene = scene;
  return this;

};

