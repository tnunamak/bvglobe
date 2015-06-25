$(function () {
  var queryDelta = 5000;

  if(!Detector.webgl){
    Detector.addGetWebGLMessage();
  } else {
    var container = $('#container')[0];
    window.globe = new DAT.Globe(container, {
      rotate: true
    });

    var xhr = new XMLHttpRequest();
    // var url = '/globe/data2000.json';
    // var url2 = '/globe/data2000.json';
    var url = 'http://10.200.18.172:8080/globe/data.json';
    requestData()
      .then(function () {
        document.body.style.backgroundImage = 'none'; // remove loading
      });
    setInterval(requestData, queryDelta);
    globe.animate();
  }

  var iter = 0;
  var normalizationFactor;

  function requestData() {
    var dfd = new $.Deferred;
    $.ajax({
      // url: iter++ % 2 === 0 ? url : url2,
      url: url,
      dataType: 'json',
      cache: true,
      success: function (data) {

        function getNormalizationFactor (data) {
          var nums = _.pluck(data, 'count');
          return 1 / Math.max.apply(Math, nums);
        }

        function normalize(item) {
          item.count = item.count * normalizationFactor;
        }

        var bucketSize = 1;
        var normalizationFactor = getNormalizationFactor(data);
        var normalizedData = _.each(data, normalize);
        var groups = _.groupBy(normalizedData, function(item, i) {
          return Math.floor(i / bucketSize);
        });

        _.each(groups, function(bucket, i) {
          var step = queryDelta / _.size(groups); // should be groups
          var fuzzSize = 0.5;
          var fuzz = Math.random() * fuzzSize + 1 - fuzzSize;
          setTimeout(_.partial(globe.addData, bucket), i * step * fuzz);
        });
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
