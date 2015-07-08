$(function () {
  var dataQueryDelta = 5000;
  var statsQueryDelta = 1000;

  var dataEndpointUrl = '../globe/data.json';
  var statsEndpointUrl = '../globe/stats.json';
  if(!Detector.webgl){
    Detector.addGetWebGLMessage();
  } else {
    var container = $('#container')[0];
    window.globe = new DAT.Globe(container, {
      rotate: true
    });

    requestData().then(function () {
      document.body.style.backgroundImage = 'none'; // remove loading
      // Show the globe
      window.globe.animate();
    });

    setInterval(requestData, dataQueryDelta);
    setInterval(requestStats, statsQueryDelta);
  }

  function requestStats () {
    console.log('requesting stats');
    $.ajax({
      url: statsEndpointUrl,
      dataType: 'json',
      cache: false,
      success: function (data) {
        console.log('received stats');
      },
      error: function (jqXHR, textStatus) {
        console.log('Error downloading stats: '+textStatus);
      }
    })
  };

  function requestData () {
    var normalizationFactor;
    var dfd = new $.Deferred();
    $.ajax({
      url: dataEndpointUrl,
      dataType: 'json',
      cache: false,
      success: function (data) {
        function normalize(item) {
          item.count = item.count * normalizationFactor;
        }
        var bucketSize = 1;
        var normalizationFactor = getNormalizationFactor(data.points);
        var normalizedData = _.each(data.points, normalize);
        var groups = _.groupBy(normalizedData, function(item, i) {
          return Math.floor(i / bucketSize);
        });

        var step = dataQueryDelta / _.size(groups); // should be groups
        var fuzzSize = 0.5;
        _.each(groups, function(bucket, i) {
          // var fuzz = Math.random() * fuzzSize + 1 - fuzzSize;
          setTimeout(_.partial(globe.addData, bucket), i * step);
        });

        dfd.resolve();
      },
      error: function (jqXHR, textStatus) {
        console.log('Error downloading data: '+textStatus);
        dfd.reject();
      }
    });
    return dfd;
  }

  /** utils */
  function getNormalizationFactor (data) {
    var nums = _.pluck(data, 'count');
    return 1 / Math.max.apply(Math, nums);
  }
});
