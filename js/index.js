!(function() {
  "use strict";

  d3.queue()
    .defer(d3.json, 'data/hobunsha_seiti_info.json')
    .defer(d3.json, 'data/city-hobunsha.geojson')
    .defer(d3.json, 'data/pref-hobunsha.geojson')
    .defer(d3.tsv, 'data/hobunsya_anime.tsv')
    .await(function(_, JSON, cityGeoJSON, prefGeoJSON, animeList) {

      var center = [36, 136];
      var selectTitle = "全作品";
      var selectMapStyle = "paint";
    
      /**********
        Map
      **********/

      //GeoJSONの分割する際のパラメーター
      const cityTileOptions = {
        maxZoom: 20,
        tolerance: 5,
        extent: 4096,
        buffer: 64,
        debug: 0,
        indexMaxZoom: 0,
        indexMaxPoints: 100000,
        type: "city"
      };
      const prefTileOptions = {
        maxZoom: 20,
        tolerance: 5,
        extent: 4096,
        buffer: 64,
        debug: 0,
        indexMaxZoom: 0,
        indexMaxPoints: 100000,
        type: "pref"
      };
  
      //GeoJSONデータをタイル座標ごとに分割する
      var cityTileIndex = geojsonvt(cityGeoJSON, cityTileOptions);
      var prefTileIndex = geojsonvt(prefGeoJSON, prefTileOptions);

      //leafetに追加するカスタムグリッドレイヤーのオブジェクトを生成
      var cityGrid = L.gridLayer();
      var prefGrid = L.gridLayer();
      var prevCityGrid = cityGrid;
      var prevPrefGrid = prefGrid;

      // Define some base layers
      var basic = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/basic-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGlyb3NhamkiLCJhIjoiY2phYW1qM2lyMHRzcTMybzd1dzhlaG83NCJ9.2QcsoUxneas4TQFI3F-DyQ',
            {id: 'basic', attribution: '© Mapbox contributors'}),
          light = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGlyb3NhamkiLCJhIjoiY2phYW1qM2lyMHRzcTMybzd1dzhlaG83NCJ9.2QcsoUxneas4TQFI3F-DyQ',
            {id: 'light', attribution: '© Mapbox contributors'}),
          satellite = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGlyb3NhamkiLCJhIjoiY2phYW1qM2lyMHRzcTMybzd1dzhlaG83NCJ9.2QcsoUxneas4TQFI3F-DyQ',
            {id: 'satellite', attribution: '© Mapbox contributors'}),
          MIERUNE_basic = L.tileLayer('https://tile.mierune.co.jp/mierune/{z}/{x}/{y}.png',
            {id: 'light', attribution: "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."}),
          MIERUNE_mono = L.tileLayer('https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png',
            {id: 'light', attribution: "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."}),
          osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {id: 'osm', attribution: '© OpenStreetMap contributors'}
          );

      var baseMaps = {
        "Basic": basic,
        "Light": light,
        "Satellite": satellite,
        "MIERUNE_basic": MIERUNE_basic,
        "MIERUNE_mono": MIERUNE_mono,
        "OpenStreetMap": osm,
      };

      // The map
      var map = L.map('map', {
        layers: [MIERUNE_mono],
        center: center,
        zoom: 5
      });

      map.zoomControl.setPosition("bottomleft");
  
      L.control.layers(baseMaps).addTo(map);
  
      var assetLayerGroup = new L.LayerGroup();
  
      var animeDetailWindow = d3.select(".anime-detail-window");
      var animeDetailWindowTitle = d3.select(".anime-detail-window__title");
      var animeDetailWindowWrap = d3.select(".anime-detail-window__wrap");
  
      var buttonIcon = d3.select(".button__icon");
      var buttonIconClose = d3.select(".button--close.anime-detail-window__button");

      var switchStyleToggle = d3.select("#switchStyle");
      var switchLayerToggle = d3.selectAll(".leaflet-control-layers-selector");

      // switch layer event
      switchLayerToggle.on("change", function() {
        var selectLayerName = d3.select(this.parentNode).select("span").html().replace(" ", "");

        if (selectMapStyle === "paint") {

          var newCityGrid = L.gridLayer();
          var newPrefGrid = L.gridLayer();
          prevCityGrid = newCityGrid;
          prevPrefGrid = newPrefGrid;
    
          d3.select(".leaflet-pane.leaflet-map-pane").remove();
          d3.select(".leaflet-control-container").remove();

          map.remove();
          map = L.map('map', {
            layers: [baseMaps[selectLayerName]],
            center: center,
            zoom: 5
          });      
          map.zoomControl.setPosition("bottomleft");
          L.control.layers(baseMaps).addTo(map);
          
          setLayer();
        }
      });

      // switch paint style / pin style event
      switchStyleToggle.on("change", function() {
        var flag = this.checked;
        // pin
        if (flag) {
          selectMapStyle = "pin";
          setMarkers();

          map.removeLayer(prevCityGrid);
          map.removeLayer(prevPrefGrid);
        }
        // paint
        else {
          selectMapStyle = "paint";

          assetLayerGroup.clearLayers();
          setLayer();
        }
      });

      // functions
      function setLayer() {
          var addCityTile = addCanvasTile(cityTileIndex, 256, selectTitle);
          var addPrefTile = addCanvasTile(prefTileIndex, 256, selectTitle);
          prevCityGrid.createTile = function(coords, done) {
            var canvas = addPrefTile(coords, done);
            return canvas;
          };
          prevPrefGrid.createTile = function(coords, done) {
            var canvas = addCityTile(coords, done);
            return canvas;
          };
          map.addLayer(prevCityGrid);
          map.addLayer(prevPrefGrid);

          var citySelector = d3.select("#canvasElement01").node().parentNode;
          d3.select(citySelector.parentNode).style("z-index", 100);
          var prefSelector = d3.select("#canvasElement02").node().parentNode;
          d3.select(prefSelector.parentNode).style("z-index", 200);
      }
  
      function setMarkers() {
          
        assetLayerGroup.clearLayers();

        if (selectTitle === "全作品") var targets = animeList.map(a => a.title);
        else var targets = [selectTitle];

        targets.forEach(target => {
          if(JSON[target][0].place) {
          
            JSON[target].forEach(d => {
              var marker = L.marker([d.lat, d.lng], {
                place: d.place,
                animeTitle: d.title,
                bounceOnAdd: true,
                bounceOnAddOptions: {duration: 500, height: 100},
                // bounceOnAddCallback: function() { console.log(d.place); }
              }).on("click", function() {
                var clickedPlace = d3.select(this).nodes()[0].options.place;
                selectTitle = d3.select(this).nodes()[0].options.animeTitle;
                updateAnimeDetailWindow(clickedPlace, selectTitle);
              });
              assetLayerGroup.addLayer(marker);
            })
            
            map.addLayer(assetLayerGroup);
          }
        })
      }
  
      var clickedOnWindow = false;
  
      function updateAnimeDetailWindow(place, title) {
        // Detect click on detail-window
        animeDetailWindow.on("click", function(){ clickedOnWindow = true; });

        if(!animeDetailWindow.classed("__open")) animeDetailWindow.classed("__open", true);
        animeDetailWindowTitle.html(place);
        animeDetailWindowWrap.html("<img class='anime-detail-window__img' src='img/scene/" + title + "/" + place + ".jpg'>");

        d3.select("#map").on("click", function() {
          if(animeDetailWindow.classed("__open") && clickedOnWindow) animeDetailWindow.classed("__open", false);
          clickedOnWindow = false;
        });
      };
  
      // button--close mouseover event
      buttonIcon.on("mouseover", function(){ buttonIconClose.classed("__touchstart", true); });
      buttonIcon.on("mouseout", function(){ buttonIconClose.classed("__touchstart", false); });

      /**********
        Swiper
      **********/
      var swiper = d3.select("#swiper");
      var swiperController = d3.select("#swiperController");
      var selectedAnimeTitle = d3.select("#selected_anime_title");

      var swiperData = Object.keys(JSON).map(function(target, i) {
        return { index: i, title: target, thumb: JSON[target][0].thumb };
      });

      swiper.datum(swiperData).call(createSwiper());

      if (navigator.appVersion.toString().indexOf(".NET") > 0) {
        //IE hack
        swiper.autoAnimation(false);
      }

      var firstLoad = true;

      swiper.on("slideChange", function(d) {
        selectTitle = d.title;
        selectedAnimeTitle.text(selectTitle);
        if(selectMapStyle === "pin") setMarkers();
        else {
          map.removeLayer(prevPrefGrid);
          map.removeLayer(prevCityGrid);
          setLayer();
        }

        if(!firstLoad) {
          // update control
          d3.select(".leaflet-top.leaflet-right").html("");
          L.control.layers(baseMaps).addTo(map);
        } else {
          firstLoad = false;
        }
      });

      swiperController.selectAll(".swip-button__button ").on("click", function() {
        var method = this.dataset.swip;
        swiper[method]();
      });

      var swiperIndex = swiperData.filter(function(d) {
        return d.title == selectTitle;
      })[0].index;

      swiper.selectSlide(swiperIndex);

  });
})();
