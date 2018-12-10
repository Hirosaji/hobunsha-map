const fs = require('fs');
const turf = require('@turf/turf');
 
// 市区町村ポリゴンデータの読み込み
const geojson = JSON.parse(fs.readFileSync('data/pref.geojson', 'utf8')); 
// 芳文社作品の聖地データの読み込み
const hobunshaJSON = JSON.parse(fs.readFileSync('../data/hobunsha_seiti_info.json', 'utf8')); 
// 芳文社作品のタイトル一覧の読み込み
const hobunshaTSV = fs.readFileSync('../data/hobunsya_anime.tsv', 'utf8').split('\r\n');
const hobunshaTitles = hobunshaTSV.filter((_, i) => i != 0);

var hobunshaData = [];
Object.keys(hobunshaJSON).forEach(key => {
    hobunshaJSON[key].forEach(d => {
        if(d.lng) hobunshaData.push(turf.point([d.lng, d.lat], d));
    });
});

var points = turf.featureCollection(hobunshaData);

// 市区町村境界データの各ポリゴン内に含まれる聖地を抽出し、プロパティに追加
geojson.features.forEach(function(feature){
    if(!feature.geometry) return null;
    try {
        var ptsWithin = turf.pointsWithinPolygon(points, feature);   // ポリゴン内に含まれるポイントを抽出 
    }
    catch(e){
        console.log(e);
        console.log(feature);
    }

    feature.properties.placeCount = {}; // 聖地数をプロパティに追加
    hobunshaTitles.forEach(t => feature.properties.placeCount[t] = 0)
    ptsWithin.features.forEach(d => {
        Object.keys(feature.properties.placeCount).forEach(key => {
            if(key === d.properties.title) feature.properties.placeCount[key] += 1
        })
    });
});

console.log(JSON.stringify(geojson)); // コンソールにGeoJSONを出力する

/** node handlePref.js > ../data/pref-hobunsha.geojson **/
