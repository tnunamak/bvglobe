$(function () {
  if(!Detector.webgl){
    Detector.addGetWebGLMessage();
  } else {
    var container = $('#container')[0];
    window.globe = new DAT.Globe(container, {
      rotate: false
    });
    console.log(globe);

    var xhr = new XMLHttpRequest();
    var url = '/globe/data.json';
    // var url = 'http://localhost:8080/globe/data.json';
    requestData()
      .then(function () {
        document.body.style.backgroundImage = 'none'; // remove loading
      });
    // setInterval(requestData,1000);
    globe.animate();
  }

  function requestData() {
    var dfd = new $.Deferred;
    $.ajax({
      url: url,
      dataType: 'json',
      cache: false,
      success: function (data) {
        window.data = data;
        globe.resetData()
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
