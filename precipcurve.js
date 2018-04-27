'use strict';

let VERSION = 1.0;

let num_ticks = 4;
let axis_x_max = 120;
let axis_y_max = 0.81;
let widget_height = 150;
let app_height = 220;

function getDateTimeFromTimestamp(unixTimeStamp) {
    var date = new Date(unixTimeStamp);
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}

var tqdata = null;

function showData(data) {
    tqdata = data.result.minutely.precipitation_2h;
    $("noti").text = data.result.minutely.short_plus ? data.result.minutely.short_plus : data.result.minutely.description;
    $("updtime").text = getDateTimeFromTimestamp(parseInt(data.local_time))
    $("axis").runtimeValue().invoke("layer.setNeedsDisplay");
}

function getData(lat, lng) {
    var coord = lat.toString() + "_" + lng.toString();
    $http.get({
        url: "http://tqt.weibo.cn/api.php?method=VicinityApi&conn=1&coord=" + coord + "&sign=b72df3aab84fc98fc83604f8f0f347bb&carrier=2&timezone=GMT%2B8&pid=free&api_key=517276d5c1d3c",
        handler: function(resp) {
            if(resp.error) {
                console.error(resp.error);
                return;
            }
            if(resp.response.statusCode != 200) {
                console.error(resp.response);
                console.error(resp.data);
                return;
            }
            var data = resp.data;
            if(data.result === undefined) {
                console.error(data);
                return;
            }
            data.local_time = Date.now();
            console.log(data);
            $cache.set("precipitation_2h", data);
            showData(data);
        }
    });
}

class UIPath {
    constructor(bezierPath=null) {
        if(bezierPath) {
            this._bezierPath = bezierPath;
        } else {
            this._bezierPath = $objc("UIBezierPath").invoke("alloc.init");
        }
    }
    moveToPoint(x, y) {
        this._bezierPath.invoke("moveToPoint", $point(x, y));
    }
    addLineToPoint(x, y) {
        this._bezierPath.invoke("addLineToPoint", $point(x, y));
    }
    closePath() {
        this._bezierPath.invoke("closePath");
    }
    fill(alpha=null) {
        if(alpha) {
            this._bezierPath.invoke("fillWithBlendMode:alpha", 0, alpha);
        } else {
            this._bezierPath.invoke("fill");
        }
    }
    stroke(alpha=null) {
        if(alpha) {
            this._bezierPath.invoke("strokeWithBlendMode:alpha", 0, alpha);
        } else {
            this._bezierPath.invoke("stroke");
        }
    }
    copy() {
        return new UIPath(this._bezierPath.invoke("copy"));
    }
    set lineWidth(value) {
        this._bezierPath.invoke("setValue:forKey:", value, "lineWidth");
    }
    get lineWidth() {
        this._bezierPath.invoke("valueForKey:", "lineWidth");
    }
}

function drawAxis(view, ctx) {
    if(!tqdata) return;

    var width = view.frame.width;
    var height = view.frame.height;

    var originX = 0;
    var originY = height;
    var endY = 0;
    var endX = width;

    var data_height = height;
    var data_width = width;

    var scaleY = data_height / axis_y_max;
    var scaleX = data_width / axis_x_max;

    var thres1 = 0.27;
    var thres2 = 0.54;

    ctx.saveGState()
    ctx.strokeColor = $color("gray");

    console.log("draw");

    let axis = new UIPath();

    

    axis.moveToPoint(originX, originY-scaleY * thres1);
    axis.addLineToPoint(originX + data_width, originY-scaleY * thres1);
    axis.moveToPoint(originX, originY-scaleY * thres2);
    axis.addLineToPoint(originX + data_width, originY-scaleY * thres2);

    for (var i=1; i < num_ticks; i++) {
        axis.moveToPoint(originX + data_width/num_ticks*i, originY-data_height);
        axis.addLineToPoint(originX + data_width/num_ticks*i, originY);
        $("x_label_"+i.toString()).updateLayout(function(make, labelview) {
            make.left.equalTo(labelview.super.left).offset(originX+data_width/num_ticks*i+5);  
        })
    }
    axis.stroke(0.5);

    drawData(ctx, tqdata, originX, originY, scaleX, scaleY);

    $("axis_tick_bar").hidden = false;

    ctx.restoreGState();
}

function drawData(ctx, data, originX, originY, scaleX, scaleY) {
    ctx.saveGState()
    ctx.fillColor = $color("#deebf7");
    ctx.strokeColor = $color("#3182bd");
    let path = new UIPath();
    path.moveToPoint(originX, originY - scaleY * data[0])
    var lastX = 0;
    for(var min in data) {
        lastX = originX + scaleX * parseInt(min);
        path.addLineToPoint(lastX, originY - scaleY * data[min]);
    }
    let strokepath = path.copy();
    path.addLineToPoint(lastX, originY);
    path.addLineToPoint(originX, originY);
    path.closePath();
    path.fill(0.5);
    strokepath.lineWidth = 2;
    strokepath.stroke(0.5);

    ctx.restoreGState()
}

var graph = {
    type: "canvas",
    layout: function(make, view) {
        make.top.left.right.bottom.inset(0);
    },
    props: {
        id: "axis"
    },
    events: {
        draw: drawAxis
    }
}

var description = {
    type: "label",
    props: {
        id: "noti",
        autoFontSize: true,
        align: $align.right,
        text: ""
    },
    layout: function(make, view) {
        make.top.equalTo(view.super).inset(10);
        make.left.inset(20);
        make.right.inset(15);
    },
    events: {
        tapped(sender) {
            update();
        }
    }
}

var update_time = {
    type: "label",
    props: {
        id: "updtime",
        align: $align.right,
        font: $font(10),
        text: ""
    },
    layout: function(make, view) {
        make.top.equalTo($("noti").bottom).offset(5);
        make.left.inset(20);
        make.right.inset(15);
    },
    events: {
        tapped(sender) {
            update();
        }
    }
}

function generateLabel() {
    var axis_labels = [];

    for(var i=1; i<num_ticks; i++) {
        var new_axis_label = {
            type: "label",
            props: {
                id: "x_label_" + i.toString(),
                font: $font(12),
                color: $rgba(0,0,0,0.5),
                text: (i * axis_x_max / num_ticks).toString()
            },
            layout: function(make, view) {
                make.left.top.bottom.inset(0);
            }
        };
        axis_labels.push(new_axis_label);
    }

    return axis_labels;
}

var axis_tick_bar = {
    type: "view",
    props: {
        id: "axis_tick_bar",
        hidden: true
    },
    views: generateLabel(),
    layout: function(make, view) {
        make.left.right.inset(0);
        make.bottom.inset(5);
        make.height.equalTo(10);
    }
}

function update() {
    $("noti").text = "Loading..."

    // $location.select({
    $location.fetch({
        handler: function(resp) {
          getData(resp.lat, resp.lng);
        }
    });

}

function generateTestData() {
    var data = {
        result: {
            minutely: {
                precipitation_2h: [],
                description: "雨渐渐变大"
            },

        },
        server_time: Math.floor(Date.now() / 1000).toString(),
        local_time: Date.now()
    };
    var start_point = 0;
    for(var i = 0; i < 120; i++) {
        start_point += Math.abs(Math.random()) * 0.02 * (Math.random() > 0.7 ? -1 : 1);
        if(start_point < 0) start_point = 0;
        data.result.minutely.precipitation_2h[i] = start_point;
    }
    return data;
}

var use_height = app_height;
if($app.env == $env.today) {
    use_height = widget_height;
}

$ui.render({
    props: {
        title: "2h降雨",
        height: use_height
    },
    views: [
        {
            type: "view",
            props: {
                id: "mainview",
            },
            views: [
                axis_tick_bar,
                graph,
                description,
                update_time
            ],
            layout: function(make, view) {
                make.top.left.right.inset(0);
                make.height.equalTo(use_height);
            }
        }
    ]
});

var cached_data = $cache.get("precipitation_2h");
cached_data = generateTestData();
if(cached_data) {
    console.log("Showing cached data");
    console.log(cached_data);
    showData(cached_data);
}
if(cached_data === undefined || cached_data.local_time === undefined || Date.now() - parseInt(cached_data.local_time) > 120 * 1000) {
    console.log("Updating data");
    //update();
}

async function updataVersion() {
    let UPDATE_FILE = "update.json";

    var resp = await $http.get("https://raw.githubusercontent.com/tete1030/precipcurve_jsbox/update/" + UPDATE_FILE);
    if(resp.error || resp.response.statusCode != 200) {
        console.error(resp);
        return;
    }
    var data = resp.data;
    if (data.version > VERSION) {
        var update_choice = await $ui.alert({
            title: "检测到新的版本！V" + data.version,
            message: "是否更新?\n更新完成后自行启动新版本\n\n" + data.info,
            actions: [{
              title: "更新",
            }, {
              title: "取消"
            }]
        });

        if(update_choice.index == 0) {
            var code_resp = await $http.get(data.update_url);
            if(resp.error || resp.response.statusCode != pre200) {
                console.error(resp);
                return;
            }
            if(code_resp.response.statusCode == 200) {
                var code_data = code_resp.data;
                $addin.save({
                    name: $addin.current,
                    data: code_data
                })
            }
            $addin.run($addin.current);
            $app.close();
        }
    }
}

updataVersion();