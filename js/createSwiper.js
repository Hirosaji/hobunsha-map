function createSwiper() {
  var _wrapper = null;

  var _minIndex = null;
  var _maxIndex = null;
  var _currentIndex = 0;
  var _slideDuration = 400;
  var _autoAnimation = true;

  var _dispatch = d3.dispatch("edgeClick", "slideClick", "slideChange");

  function instance(_selection) {
    _selection.on = function() {
      return this.on.apply(_dispatch, arguments);
    };

    _selection.each(function(_data) {
      _wrapper = d3
        .select(this)
        .append("div")
        .classed("swiper-wrapper", true);

      main();

      function main() {
        getIndex(_data);

        addSlide(_data);
        addBlank();

        //デフォルトのインデックス
        selectedSlide(_currentIndex, _selection.node(), 0);

        setClickSlideEvent(_selection);
        setClickEdgeEvent(_selection);
        setKeyEvent(_selection);
      }

      _selection.minIndex = function(_arg) {
        if (!arguments.length) return _minIndex;
        _minIndex = _arg;
        return this;
      };
      _selection.maxIndex = function(_arg) {
        if (!arguments.length) return _maxIndex;
        _maxIndex = _arg;
        return this;
      };

      _selection.nextSlide = function() {
        if (_maxIndex <= _currentIndex) return;
        _currentIndex += 1;
        selectedSlide(_currentIndex, _selection.node(), _slideDuration);
        return this;
      };

      _selection.prevSlide = function() {
        if (_minIndex >= _currentIndex) return;
        _currentIndex -= 1;
        selectedSlide(_currentIndex, _selection.node(), _slideDuration);
        return this;
      };

      _selection.selectSlide = function(_arg) {
        if (!arguments.length) return _currentIndex;
        _currentIndex = _arg;
        selectedSlide(_currentIndex, _selection.node(), 0);
        return this;
      };

      _selection.autoAnimation = function(_arg) {
        if (!arguments.length) return _autoAnimation;
        _autoAnimation = _arg;
        return this;
      };
    });
  }

  function addSlide(_data) {
    var selectSlide = _wrapper.selectAll("swiper-slide").data(_data);

    var enterSlide = selectSlide
      .enter()
      .append("img")
      .classed("swiper-slide clickable", true)
      .attr("src", function(d){ return "img/key_visual/" + d.thumb; });

    selectSlide
      .merge(enterSlide)
      .attr("data-index", function(d, i) {
        return i;
      })
      .attr("data-value", function(d) {
        if(d.title) return d.title;
        else return "No data";
      })
      .text(function(d) {
        if(d.title) return d.title;
        else return "No data";
      });
  }

  function getIndex(_data) {
    _minIndex = 0;
    _maxIndex = _data.length - 1;
  }

  function addBlank() {
    _wrapper.insert("div", ":first-child").classed("swiper-blank", true);
    _wrapper.append("div").classed("swiper-blank", true);
  }

  //スライドがクリックされた際に発行されるイベントを設定
  function setClickSlideEvent(_selection) {
    _wrapper.selectAll(".swiper-slide").on("click.centerd", function(d, i) {
      selectedSlide(i, _selection.node(), _slideDuration);
      _dispatch.call("slideClick", this, d);
    });
  }

  //端のスライドがクリックされた際に発行されるイベントを設定
  function setClickEdgeEvent(_selection) {
    var edge = d3.selectAll(".swiper-slide").filter(function(d, i, node) {
      if (0 == i) d._edge = "first";
      if (node.length - 1 == i) d._edge = "first";
      return 0 == i || node.length - 1 == i;
    });

    edge.on("click.edgeclick", function(d) {
      _dispatch.call("edgeClick", this, d);
    });
  }

  function setKeyEvent(_selection) {
    var KeyDownFunc = function(e) {
      var keyCode = e.keyCode;
      if (keyCode == 37 || keyCode == 38) {
        //←アローキー
        _selection.prevSlide();
      } else if (keyCode == 39 || keyCode == 40) {
        //→アローキー
        _selection.nextSlide();
      }
    };

    if (document.addEventListener) {
      document.addEventListener("keydown", KeyDownFunc);
    } else if (document.attachEvent) {
      document.attachEvent("onkeydown", KeyDownFunc);
    }
  }

  function selectedSlide(index, container, duration) {
    d3.selectAll(".swiper-slide").classed("swiper-slide-active", false);

    var slide = d3
      .selectAll(".swiper-slide")
      .filter(function(d, i, node) {
        return i == index;
      })
      .classed("swiper-slide-active", true);

    var start = container.scrollLeft;
    var target = slide.node().offsetLeft - container.clientWidth / 2 + 45;

    if (_autoAnimation) {
      if (!duration) {
        container.scrollLeft = target;
      } else {
        moveTween(start, target, duration, d3.easeCubicOut, function(d) {
          container.scrollLeft = d;
        });
      }
    }

    _currentIndex = index;
    _dispatch.call("slideChange", this, slide.datum());
  }

  function moveTween(start, target, duration, ease, callback) {
    var scale = d3
      .scaleLinear()
      .domain([0, duration])
      .range([0, 1]); //.clamp(true);
    var interpolateX = d3.interpolate(start, target);
    var t = d3.timer(function(elapsed) {
      var c = ease(scale(elapsed));
      callback(interpolateX(c));
      if (elapsed > duration) t.stop();
    }, 100);
  }

  return instance;
}
