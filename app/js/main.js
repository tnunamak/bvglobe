$(function () {
  if(!Detector.webgl){
      Detector.addGetWebGLMessage();
    } else {
      var container = $('#container');
      var globe = new DAT.Globe(container[0]);

      console.log(globe);
      var i, tweens = [];

      var xhr;
      TWEEN.start();


      xhr = new XMLHttpRequest();
      xhr.open('GET', '/globe/fake.json', true);
      xhr.onreadystatechange = function(e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            window.data = data;
            changeData(0)
            globe.animate();
            document.body.style.backgroundImage = 'none'; // remove loading
          }
        }
      };
      xhr.send(null);
    }
    window.changeData = function (i) {
      globe.resetData();
      globe.addData(window.data[i][1], {
        format: 'magnitude',
        name: window.data[i][0],
        animated: true
      });
      globe.createPoints();
      new TWEEN.Tween(globe).to({ time: i/3 },500).easing(TWEEN.Easing.Cubic.EaseOut).start();
    }
})

