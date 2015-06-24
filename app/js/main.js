if(!Detector.webgl){
  Detector.addGetWebGLMessage();
} else {
  var container = document.getElementById('container');
  window.globe = new DAT.Globe(container);
  console.log(globe);

  var xhr = new XMLHttpRequest();
  var url = '/globe/data.json';
  // var url = 'http://localhost:8080/globe/data.json';
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        globe.addData(data);
        globe.animate();
        document.body.style.backgroundImage = 'none'; // remove loading
      }
    }
  };
  xhr.send(null);
}
