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

  var startX = 3.5;
  var startY = 0.3;
  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: startX, y: startY },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 100000;
  var PI_HALF = Math.PI / 2;
  var EARTH_RADIUS = 200;
  var MAX_PARTICLES = 10000;
  var particles;
  var particlePool = [];

  function init() {
    var earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 40, 30);

    scene = new THREE.Scene();

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
    camera.position.z = distance;

    addPointCloud(scene);
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

    function addPointCloud(scene) {
      var particleSize = '1.5';
      var particleGeometry = new THREE.Geometry();
      var particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { type: "c", value: new THREE.Color( 0x00ff00 ) }
        },
        attributes: {
          alpha: { type: 'f', value: [] }
        },
        transparent: true,
        vertexShader: ['attribute float alpha;',
          'varying float vAlpha;',
          'void main() {',
              'vAlpha = alpha;',
              'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
              'gl_PointSize = ' + particleSize + ';',
              'gl_Position = projectionMatrix * mvPosition;',
          '}'].join('\n'),
        fragmentShader: ['uniform vec3 color;',
          'varying float vAlpha;',
          'void main() {',
              'gl_FragColor = vec4( color, vAlpha );',
          '}'].join('\n')
      });

      // pre-allocate particles
      _.each(_.range(MAX_PARTICLES), function(i) {
        particleMaterial.attributes.alpha.value[i] = 1;
        var particle = new THREE.Vector3(0, 0, 0);
        particlePool.push(particle);
        particleGeometry.vertices.push(particle);
      });

      particles = new THREE.PointCloud( particleGeometry, particleMaterial );
      particles.name = 'point_cloud';
      scene.add(particles);
    }

    function addEarth(scene) {
      var material = new THREE.MeshLambertMaterial({
        map: THREE.ImageUtils.loadTexture(imgDir+'/world-blue.jpg')
      });

      var mesh = new THREE.Mesh(earthGeometry, material);
      mesh.rotation.y = Math.PI;
      scene.add(mesh);
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

        var sunAngle = (2 * Math.PI * percentDayElapsed) + angleAtMidnight;

        light.position.set(Math.cos(sunAngle), 0, Math.sin(sunAngle));
      }
    }
  }

  function addData(data) {
    var lat, lng, size, color;

    if(_.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        add(data[i]);
      }
    } else {
      add(data);
    }

    function add(point) {
      lat = point.latitude;
      lng = point.longitude;
      size = point.count;
      color = colorFn(size);

      addPoint(lat, lng, size, color);
    }
  }

  function addPoint(lat, lng, size, color) {
    /*
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

    point.position.x = EARTH_RADIUS * Math.sin(phi) * Math.cos(theta);
    point.position.y = EARTH_RADIUS * Math.cos(phi);
    point.position.z = EARTH_RADIUS * Math.sin(phi) * Math.sin(theta);

    point.lookAt(atmosphereMesh.position);

    point.scale.z = zSize;
    point.updateMatrix();

    for (var i = 0; i < point.geometry.faces.length; i++) {
      point.geometry.faces[i].color = color;
    }
    if(point.matrixAutoUpdate){
      point.updateMatrix();
    }*/

    _.each(_.range(size), function (i) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (180 - lng) * Math.PI / 180;

      var particle = particlePool.pop();

      if(_.isUndefined(particle)) {
        console.log('The pool ran out of particles');
        return;
      }

      add();

      function add() {
        particle.x = EARTH_RADIUS * Math.sin(phi) * Math.cos(theta);
        particle.y = EARTH_RADIUS * Math.cos(phi);
        particle.z = EARTH_RADIUS * Math.sin(phi) * Math.sin(theta);

        particles.geometry.verticesNeedUpdate = true;
      }
    });

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
      var child = scene.children[i];

      if (child && child.name.indexOf('point') === 0) { // TODO change name to particles
        _.each(child.geometry.vertices, function(particle, j) {
          var alpha = child.material.attributes.alpha;

          if(particle.x !== 0 || particle.y !== 0 || particle.z !== 0) {
            particle.multiplyScalar(1.002);
            alpha.value[j] *= 0.985;

            if (alpha.value[j] < 0.01) {
              particle.x = 0;
              particle.y = 0;
              particle.z = 0;

              alpha.value[j] = 1;
              particlePool.push(particle);
            } else {
              child.geometry.verticesNeedUpdate = true;
            }

            alpha.needsUpdate = true;
          }

        });
      }
      // loop through and decay each point
      else if (child && child.name.indexOf('point') === 0) { // TODO add support back in for decaying bars
        // shrink/decay at this point
        child.scale.z *= .996;

        if(child.scale.z < .5) {
          scene.remove(child);
          child.geometry.dispose();
          child.material.dispose();
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

    camera.lookAt(new THREE.Vector3(0, 0, 0));

    renderer.render(scene, camera);
  }

  init();
  this.animate = animate;
  this.addData = addData;
  this.renderer = renderer;
  this.scene = scene;
  return this;
};

