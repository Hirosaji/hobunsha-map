function addCanvasTile(tileIndex, size, selectTitle) {
  return function(coords, done) {
    var canvas = addCanvas(coords, done, size, coords.z);
    return canvas;
  };

  function addCanvas(coords, done, size, zoom, clickable) {
    if(!size) size = 256;
    var pad = 0;

    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    if(tileIndex.options.type === "city") canvas.id = "canvasElement01";
    else if(tileIndex.options.type === "pref") canvas.id = "canvasElement02";
    var ctx = canvas.getContext("2d");
    
    //デフォルトスタイル
    var _fillStyle = "white";
    var _storkeStyle = "black";

    var _lineWidth = 0.075;

    var padding = 8 / 512;
    var totalExtent = 4096 * (1 + padding * 2);
    var ratio = size / totalExtent;
    var radius = ~~(2 - Math.PI * (3 - Math.sqrt(zoom)));
    if (radius <= 0) radius = 0.6;

    var tile = tileIndex.getTile(coords.z, coords.x, coords.y);

    if (!tile) {
      //console.log('tile empty');
      return canvas;
    }

    var features = tile.features;

    for (var i = 0; i < features.length; i++) {
      var feature = features[i],
        type = feature.type,
        tags = feature.tags;
        

      if (selectTitle === "全作品") {
        var seitiBool = Object.values(tags.placeCount).some(value => value > 0);
      } else {
        var seitiBool = tags.placeCount[selectTitle] > 0;
      };

      if (clickable) {

        ctx.fillStyle = tags._pickingColor
          ? tags._pickingColor
          : null;
        ctx.strokeStyle = tags._pickingColor
          ? tags._pickingColor
          : null;
          
      } else if(tileIndex.options.type === "city") {
        
        ctx.fillStyle = seitiBool
          ? '#F12500'
          : _fillStyle;
        if (tags._setLineDash)
          ctx.setLineDash(tags._setLineDash);
        ctx.strokeStyle = seitiBool
          ? '#F12500'
          : _storkeStyle;
        ctx.lineWidth = tags._lineWidth
          ? tags._lineWidth
          : _lineWidth;

      } else if(tileIndex.options.type === "pref") {

        ctx.fillStyle = seitiBool
          ? "rgba(235, 0, 0, 0.1)"
          : "rgba(0, 0, 0, 0)";
        ctx.strokeStyle = _storkeStyle;
        ctx.lineWidth = 0.15;

      }

      ctx.beginPath();

      for (var j = 0; j < feature.geometry.length; j++) {
        var geom = feature.geometry[j];

        if (type === 1) { //ポイントの場合は円を描く
          pad = 4096 * padding * ratio;

          ctx.arc(
            ~~geom[0] * ratio + pad,
            geom[1] * ratio + pad,
            2,
            0,
            2 * Math.PI,
            false
          );
          continue;
        }

        for (var k = 0; k < geom.length; k++) {
          var p = geom[k];
          var extent = 4096;

          var x = p[0] / extent * size;
          var y = p[1] / extent * size;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      }

      if (type === 3 || type === 1) ctx.fill("evenodd");
      ctx.stroke();
    }

    setTimeout(function() {
      done(null, canvas);
    }, 10);

    return canvas;
  }
}
