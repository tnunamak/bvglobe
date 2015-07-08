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
      // remove loading
      document.body.style.backgroundImage = 'none';
      // Show the globe
      window.globe.animate();
    });

    setInterval(requestData, dataQueryDelta);
    setInterval(requestStats, statsQueryDelta);
  }

  function requestStats () {
    $.ajax({
      url: statsEndpointUrl,
      dataType: 'json',
      cache: false,
      success: function (data) {
        // update total count
        $('#totalPageViews').text(data.count);
        var since = new Date(Date.now() - data.lastTimestamp).toLocaleString();
        $('#since').text(since);
        // update countries
        var $list = $('<ol></ol>');
        var $li;
        _.each(data.countries, function (countryData) {
          $li = $('<li></li>');
          $li.text(countryData.name + ' - '+ countryData.count);
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
