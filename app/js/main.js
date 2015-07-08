$(function () {
  var DATA_QUERY_DELTA = 5000;

  // var dataEndpointUrl = '../globe/data.json';
  var dataSince = 0;
  var dataEndpointUrl = '../globe/data.json';

  // var statsEndpointUrl = '../globe/stats.json';
  var statsSince = new Date();
  statsSince.setHours(0,0,0,0);// use local midnight.

  var statsEndpointUrl = '../globe/statistics.json';

  if(!Detector.webgl){
    Detector.addGetWebGLMessage();
  } else {
    var container = $('#container')[0];
    window.globe = new DAT.Globe(container, {
      rotate: true
    });

    requestData().then(function () {
      // remove loading
      document.body.style.backgroundImage = 'none';
      // Show the globe
      window.globe.animate();
    });
    requestStats();

    setInterval(requestData, DATA_QUERY_DELTA);
    setInterval(requestStats, 5000);
  }

  function requestStats () {
    var url = statsEndpointUrl + '?limit=10&since=' + statsSince.getTime();
    $.ajax({
      url: url,
      dataType: 'json',
      cache: false,
      success: function (data) {
        // update total count
        $('#totalPageViews').text(formatCount(data.count));
        // update countries
        var $list = $('<ol></ol>');
        var $li;
        _.each(data.countries, function (countryData) {
          $li = $('<li></li>');
          $li.text(countryData.name + ' - '+ formatCount(countryData.count));
          $list.append($li);
        });
        $('#countryStats').html($list)
      },
      error: function (jqXHR, textStatus) {
        console.log('Error downloading stats: '+textStatus);
      }
    })
  };

  function requestData () {
    var normalizationFactor;
    var dfd = new $.Deferred();
    var url = dataEndpointUrl + '?since=' + dataSince;
    $.ajax({
      url: url,
      dataType: 'json',
      cache: false,
      success: function (data) {
        dataSince = data.time;
        function normalize(item) {
          item.count = item.count * normalizationFactor;
        }
        var bucketSize = 1;
        var normalizationFactor = getNormalizationFactor(data.points);
        var normalizedData = _.each(data.points, normalize);
        var groups = _.groupBy(normalizedData, function(item, i) {
          return Math.floor(i / bucketSize);
        });

        var step = DATA_QUERY_DELTA / _.size(groups); // should be groups
        _.each(groups, function(bucket, i) {
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

  function formatCount(number) {
    return new Number(number).toLocaleString();
  }
});
