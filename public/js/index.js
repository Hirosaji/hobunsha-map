!(function() {
  "use strict";

  // Load data
  d3.queue()
    .defer(d3.json, 'data/hobunsha_seiti_info.json')
    .defer(d3.json, 'data/city-hobunsha.geojson')
    .defer(d3.json, 'data/pref-hobunsha.geojson')
    .defer(d3.tsv, 'data/hobunsya_anime.tsv')
    .await(function(_, JSON, cityGeoJSON, prefGeoJSON, animeList) {

      // Init options
      var center = [36, 137.6];
      var selectTitle = "ひだまりスケッチ";
      var selectMapStyle = "pin";
    
      /**********
        Map
      **********/

      // Canvas tile parameters
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
  
      // Devide GeoJSON data into canvas tiles
      var cityTileIndex = geojsonvt(cityGeoJSON, cityTileOptions);
      var prefTileIndex = geojsonvt(prefGeoJSON, prefTileOptions);

      // Add custom grid layer object on leaflet
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
            {id: 'mierune_basic', attribution: "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."}),
          MIERUNE_mono = L.tileLayer('https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png',
            {id: 'mierune_mono', attribution: "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."}),
          osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {id: 'osm', attribution: '© OpenStreetMap contributors'}
          );

      var baseMaps = {
        "汎用地図（OpenStreetMap）": osm,
        // "MIERUNE_basic": MIERUNE_basic,
        "モノトーン（MIERUNE）": MIERUNE_mono,
        // "Basic": basic,
        // "Light": light,
        "衛星写真（Mapbox）": satellite,
      };

      // The map
      var map = L.map('map', {
        layers: [osm],
        center: center,
        zoom: 5
      });

      map.zoomControl.setPosition("bottomleft");  // zoom position
  
      L.control.layers(baseMaps).addTo(map);
  
      var assetLayerGroup = new L.LayerGroup();
  
      var animeDetailWindow = d3.select(".anime-detail-window");
      var animeDetailWindowTitle = d3.select(".anime-detail-window__title");
      var animeDetailWindowWrap = d3.select(".anime-detail-window__wrap");
      var animeDetailWindowButton = d3.select(".anime-detail-window__button");
  
      var buttonIcon = d3.select(".button__icon");
      var buttonIconClose = d3.select(".button--close.anime-detail-window__button");

      var switchStyleToggle = d3.select("#switchStyle");
      var switchLayerToggle = d3.selectAll(".leaflet-control-layers-selector");

      // Switch layer event
      switchLayerToggle.on("change", function() {
        var selectLayerName = d3.select(this.parentNode).select("span").html().replace(" ", "");

        // Update map components (when "pin" -> "paint")
        if (selectMapStyle === "paint") {

          var newCityGrid = L.gridLayer();
          var newPrefGrid = L.gridLayer();
          prevCityGrid = newCityGrid;
          prevPrefGrid = newPrefGrid;

          // remove map components
          d3.select(".leaflet-pane.leaflet-map-pane").remove();
          d3.select(".leaflet-control-container").remove();
          map.remove();

          // set map components
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

      // Switch paint style / pin style event
      switchStyleToggle.on("change", function() {
        var flag = this.checked;
        // paint
        if (flag) {
          selectMapStyle = "paint";

          assetLayerGroup.clearLayers();
          setLayer();

          animeDetailWindow.classed("__open", false);  // close window
        }
        // pin
        else {
          selectMapStyle = "pin";
          setMarkers();

          map.removeLayer(prevCityGrid);
          map.removeLayer(prevPrefGrid);
        }
      });

      /******************
        Event functions
      ******************/
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
  
      var imgNum = 0;
      var imgOrder = 0;

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
                imgNum: d.num,
                bounceOnAdd: true,
                bounceOnAddOptions: {duration: 500, height: 100},
                // bounceOnAddCallback: function() { console.log(d.place); }
              }).on("click", function() {
                var clickedPlace = d3.select(this).nodes()[0].options.place;
                selectTitle = d3.select(this).nodes()[0].options.animeTitle;
                imgNum = d3.select(this).nodes()[0].options.imgNum;
                updateAnimeDetailWindow(clickedPlace, selectTitle);
              });
              assetLayerGroup.addLayer(marker);
            })
            
            map.addLayer(assetLayerGroup);
          }
        })

        changePinColor();  // change pin color
      }

      var _markerSrc;

      // Change clicked pin color
      function changePinColor() {
        d3.selectAll('.leaflet-marker-icon').on('click', function() {
          _markerSrc = d3.select(this).attr('src').replace('_red', '').split('.png')[0];

          d3.selectAll('.leaflet-marker-icon').attr('src', _markerSrc + '.png');
          d3.select(this).attr('src', _markerSrc + '_red.png');
        });
      }
  
      var clickedOnWindow = false;
  
      function updateAnimeDetailWindow(place, title) {
        // Detect click on detail-window
        animeDetailWindowButton.on("click", function(){ clickedOnWindow = true; });

        // Open window event
        if(!animeDetailWindow.classed("__open")) animeDetailWindow.classed("__open", true);
        animeDetailWindowTitle.html(place);

        d3.select("#map").on("click", function() {
          if(animeDetailWindow.classed("__open") && clickedOnWindow) animeDetailWindow.classed("__open", false);
          clickedOnWindow = false;
        });

        /**********
          Image Swiper
        **********/
        var imgHtml = '';
        for (var i = 0; i < imgNum; i++) {
          var activeClass = (i === 0) ? ' swiper-img__active' : '';
          imgHtml = imgHtml + 
            '<div class="swiper-slide"> \
              <img class="swiper-img' + activeClass + '" id="img' + i + '" src="img/scene/' + title + '/' + place + '/' + place + '-' + i + '.jpg"> \
            </div>';
        }
        var swiperHtml = '<div class="anime-detail-window__img"> \
          <div class="swiper-container"> \
            <div class="swiper-wrapper">' + imgHtml + '</div> \
            <div class="swiper-pagination"></div> \
            <div class="swiper-button-prev"></div> \
            <div class="swiper-button-next"></div> \
          </div> \
        </div>';

        animeDetailWindowWrap.html(swiperHtml);

        // remove extra swiper option
        if(imgNum === 1) {
          d3.select('.swiper-pagination').remove();
          d3.select('.swiper-button-prev').remove();
          d3.select('.swiper-button-next').remove();
        }

        // Swiper event parameters
        new Swiper('.swiper-container', {
          // Optional parameters
          direction: 'horizontal',
          loop: true,

          // Pagination
          pagination: {
            el: '.swiper-pagination',
            type: 'progressbar',
          },

          // Navigation arrows
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },

          // Scrollbar
          scrollbar: {
            el: '.swiper-scrollbar',
          },
        });

      };
      
      // button--close event
      buttonIcon.on("mouseover", function(){ buttonIconClose.classed("__touchstart", true); });
      buttonIcon.on("mouseout", function(){ buttonIconClose.classed("__touchstart", false); });
      buttonIcon.on("click", function(){
        d3.selectAll('.leaflet-marker-icon').attr('src', _markerSrc.replace('_red', '') + '.png');
      })

      /**********
        Slider
      **********/
      var slider = d3.select("#slider");
      var sliderController = d3.select("#sliderController");
      var selectedAnimeTitle = d3.select("#selected_anime_title");

      // Gather no-data title
      var noDataTitle = Object.keys(JSON).filter(key => (key !== "全作品" && !(JSON[key][0].place)))

      var sliderData = Object.keys(JSON).map(function(target, i) {
        var noData = (noDataTitle.indexOf(target) > -1) ? true : false;
        return { index: i, title: target, thumb: JSON[target][0].thumb, noData: noData};
      });

      slider.datum(sliderData).call(createSlider());

      if (navigator.appVersion.toString().indexOf(".NET") > 0) {
        //IE hack
        slider.autoAnimation(false);
      }

      var firstLoad = true;

      // Update map components
      slider.on("slideChange", function(d) {
        selectTitle = d.title;
        selectedAnimeTitle.text(selectTitle);
        if(selectMapStyle === "pin") setMarkers();
        else {
          map.removeLayer(prevPrefGrid);
          map.removeLayer(prevCityGrid);
          setLayer();
        }

        if(!firstLoad) {
          // Update control
          d3.select(".leaflet-top.leaflet-right").html("");
          L.control.layers(baseMaps).addTo(map);
        } else {
          firstLoad = false;
        }

        // Initialize imgOrder
        d3.selectAll('.leaflet-marker-icon').on('click', function() { imgOrder = 0; });

        changePinColor();  // change pin color
        animeDetailWindow.classed("__open", false);  // close window
      });

      // Update slider UI
      sliderController.selectAll(".swip-button__button").on("click", function() {
        var method = this.dataset.swip;
        slider[method]();
      });

      var sliderIndex = sliderData.filter(function(d) {
        return d.title == selectTitle;
      })[0].index;

      slider.selectSlide(sliderIndex);


      /**********
        others
      **********/
      changePinColor();  // change pin color

  });
})();
