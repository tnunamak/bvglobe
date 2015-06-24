$(function () {
  if(!Detector.webgl){
    Detector.addGetWebGLMessage();
  } else {
    var container = $('#container')[0];
    window.globe = new DAT.Globe(container, {
      rotate: true
    });
    console.log(globe);

    var xhr = new XMLHttpRequest();
    var url = '/globe/data.json';
    var url2 = '/globe/data2.json';
    // var url = 'http://localhost:8080/globe/data.json';
    requestData()
      .then(function () {
        document.body.style.backgroundImage = 'none'; // remove loading
      });
    // setInterval(requestData, 5000);
    globe.animate();
  }

  var iter = 0;

  function requestData() {
    var dfd = new $.Deferred;
    $.ajax({
      url: iter++ % 2 === 0 ? url : url2,
      dataType: 'json',
      cache: false,
      success: function (data) {
        window.data = data;
        // globe.resetData()
        globe.addData(data);
        dfd.resolve();
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.log('Error downloading data: '+textStatus);
        dfd.reject();
      }
    });
    return dfd;
  }
});
