$(function () {
  var DEBUG = true;
  var $countryStats = $('#countryStats');
  var $totalCount = $('#totalPageViews');
  var $lastSince = $('#lastSince');

  var endpointPrefix = DEBUG ? '..' : 'http://qa-bvglobe.portal.bazaarvoice.com/api';
  var DATA_QUERY_DELTA = 5000;

  // var dataEndpointUrl = '../globe/data.json';
  var dataSince = 0;
  // buffer 10 seconds to avoid getting partial buckets (less data)
  var dataSinceBuffer = 10000;
  var dataEndpointUrl = endpointPrefix + '/globe/data.json';

  // var statsEndpointUrl = '../globe/stats.json';
  // var statsSince = new Date();
  // statsSince.setHours(0,0,0,0);// use local midnight.
  var statsSince = new Date(Date.now()); // use now temporarily
  var statsEndpointUrl = endpointPrefix + '/globe/statistics.json';

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

    requestStats().then(function () {
      $('.overlay').show();
    });

    setInterval(requestData, DATA_QUERY_DELTA);
    setInterval(requestStats, 1000);
  }

  function requestStats () {
    var dfd = new $.Deferred();
    var url = statsEndpointUrl + '?limit=10&since=' + statsSince.getTime();
    $.ajax({
      url: url,
      dataType: 'json',
      cache: false,
      success: function (data) {
        var $country, $count, $tr;
        // update total count
        $totalCount.text(formatCount(data.count));
        $lastSince.text(new Date(data.firstTimestamp).toLocaleString());
        // update countries
        $countryStats.empty();
        _.each(data.countries, function (countryData) {
          $tr = $('<tr></tr>')
          $country = $('<td></td>').text(countryData.name);
          $count = $('<td></td>').text(formatCount(countryData.count));
          $tr.append($country);
          $tr.append($count);
          $countryStats.append($tr);
        });
        dfd.resolve();
      },
      error: function (jqXHR, textStatus) {
        console.log('Error downloading stats: '+textStatus);
        dfd.reject();
      }
    });
    return dfd;
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
        dataSince = (data.time - dataSinceBuffer);
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
