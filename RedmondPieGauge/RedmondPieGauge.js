
define( ["jquery", "./raphael-min"], function ( $, Raphael ) {

	return {
		initialProperties: {
			version: 1.0,
			qHyperCubeDef: {
				qDimensions: [],
				qMeasures: [],
				qInitialDataFetch: [{
					qWidth: 10,
					qHeight: 500
				}]
			}
		},
		//property panel
		definition: {
			type: "items",
			component: "accordion",
			items: {
				dimensions: {
					uses: "dimensions",
					min: 1,
					max: 1
				},
				measures: {
					uses: "measures",
					min: 2,
					max: 2
				},
				sorting: {
					uses: "sorting"
				},
				settings: {
					uses: "settings",
					items:{
						customIntProp: {
							type: "integer",
							label: "Doughnut Percentage",
							ref: "myproperties.doughnutpercentage",
							defaultValue: "0",
							component: "slider",
							min: "0",
							max: "70"
						}
					}
				}
			}
		},
		snapshot: {
			canTakeSnapshot: true
		},

		paint: function ( $element, layout ) {
		
			// Assign the extension object to a local variable
			var _this = this;

			// Get the chart ID from the QlikView document for this control - will be something like "CH2340091" or "CH01"
			var divName = layout.qInfo.qId;

			// Calculate the height and width that user has drawn the extension object
            var vw = $element.width();
            var vh = $element.height();
			
			var html = '<div id="canvas'
				  + divName
				  + '" style="width:' + vw + 'px;'
				  + 'height:' + vh + 'px;'
				  + 'left: 0; position: absolute;'
				  + 'top: 0;z-index:999;"></div>';
			
			$element.html( html );
			
			var paper = Raphael("canvas" + divName, vw, vh);
			
            // Generate the hoverBox if it doesn't exist already
            // This will hold the popup text
            if ($('#hoverBox').length == 0)
                $("body").append('<div id="hoverBox" style="z-index:99; display:none;font-size:12px;background-color: #fff;color:#333;font-family:Arial, Helvetica, sans-serif;position:absolute;top:0px;left:0px;background-repeat:no-repeat;overflow:hidden;z-index:999999999 !important;padding:0px 10px;border:1px solid #439400;line-height:14px;"><p></p></div>');
             
			drawChart(_this, layout, divName, vw, vh);
						
			if ( this.selectionsEnabled ) {
				$element.find( '.selectable' ).on( 'qv-activate', function () {
					if ( this.hasAttribute( "data-value" ) ) {
						var value = parseInt( this.getAttribute( "data-value" ), 10 ), dim = 0;
						//var value = this.getAttribute( "data-value" ), dim = 0;
						_this.selectValues( dim, [value], true );
						$( this ).toggleClass( "selected" );
					}
				} );
			}
			
		}
	};

} );

/// drawChart cycles through the data and calls another function to draw the pies
function drawChart(_this, layout, divName, frameX, frameY) {
	var dimensions = layout.qHyperCube.qDimensionInfo,
		qData = layout.qHyperCube.qDataPages[0].qMatrix;

	var paper = Raphael("canvas" + divName, frameX, frameY);
	
    // Variable to define the default line colour.
    var linecolor = "#F0F0FA";  // default to light grey for now

	var numRows=layout.qHyperCube.qSize.qcy;

	var squareWidth = Math.floor(frameX / numRows);
	
	var pieRadius = Math.floor((squareWidth<frameY ? squareWidth : frameY*0.9) * 0.4);

	var cx = Math.floor(squareWidth/2);
	var cy = Math.floor(frameY/2*0.8);

	var doughnutpercentage=(layout.myproperties.doughnutpercentage) ? layout.myproperties.doughnutpercentage : 0;
	
	$.each( qData, function ( key, value ) {

		var r1=pieRadius*doughnutpercentage/100;
		
		drawPie(_this, paper, linecolor, value, cx, cy, r1, pieRadius);	

		cx += squareWidth;
	} );
}

/// drawPie calculates the segment sizes and calls the segment function to draw them
function drawPie(_this, paper, linecolor, row, cx, cy, r, rin) {	

	var Actual=parseFloat(row[1].qNum);
	var Target=parseFloat(row[2].qNum);
	
	var Total=Actual > Target ? Actual : Target;
	
	var Low=Actual > Target ? 0 : Target-Actual;
	var Middle=Actual > Target ? Actual - (Actual-Target) : Actual;
	var High=Actual > Target ? Actual-Target : 0;
	
	var angleOffset=90;
	var startAngle=angleOffset+0;
	var LowEndAngle=angleOffset+(Math.floor(360 * (Low/Total)));
	var MiddleEndAngle=(Actual > Target ? (LowEndAngle+Math.floor(360 * (Middle/Total))) : angleOffset+360);
	var endAngle=angleOffset+360;
	
	var popupText='<table><tr><th colspan="2">' + row[0].qText + '</th></tr><tr><td>Target:</td><td align="right">' + addCommas(Target) + '</td></tr><tr><td>Actual:</td><td align="right">' + addCommas(Actual) + '</td></tr></table>' ;
	var searchText=row[0].qText;
	var columnNumber=0;
	var params={ fill: "#fee501", stroke: linecolor, "stroke-width": "1px" };

	if (Target>Actual)
		segment(row[0].qElemNumber, paper, cx, cy, r, rin, startAngle, LowEndAngle, popupText, searchText, columnNumber, { fill: "#ff0000", stroke: linecolor, "stroke-width": "1px" });
	segment(row[0].qElemNumber, paper, cx, cy, r, rin, LowEndAngle, MiddleEndAngle, popupText, searchText, columnNumber, { fill: linecolor, stroke: linecolor, "stroke-width": "1px" });
	if (Actual > Target)
		segment(row[0].qElemNumber, paper, cx, cy, r, rin, MiddleEndAngle, endAngle, popupText, searchText, columnNumber, { fill: "#00ff00", stroke: linecolor, "stroke-width": "1px" });

	
	// Use Raphael to generate the SVG text object
	var txt = paper.text(cx, (cy + rin)*1.1, searchText);
	// set the font size relative to the size of the sector
	txt.attr({ "font-size": (Math.round(rin / 5)), "font-family": "Arial, Helvetica, sans-serif" });

	// Make it selectable
	(txt.node.className ? txt.node.className.baseVal = 'selectable' : txt.node.setAttribute('class',  'selectable'));
	txt.node.setAttribute("data-value", row[0].qElemNumber);
	
}

/// This function takes several parameters and actually draws the segments
/// Parameters:
///     qElemNumber -   the selectable element number in the data set
///     paper       -   the Raphael canvas object
///     cx          -   the x coordinate of the centre of the circle for which the sector will be drawn
///     cy          -   the y coordinate of the centre
///     r           -   the inside radius of the sector
///     rin         -   the outside radius of the sector
///     startAngle  -   the initial angle for the sector
///     endAngle    -   the end angle for the sector
///     popupText   -   the text to be displayed in a popup. Can be html markup. If blank, no popup will be rendered
///     searchText  -   the text to be displayed in the sector as well as that passed to the QlikView search function
///     columnNumber-   the column number is used to specify which column in the _this results to search on. 
///                     If the columnNumber == -1, then the click will perform a clear instead of select
///     params      -   drawing parameters for the sector. E.g. { fill: vColor, stroke: linecolor, "stroke-width": "1px" }
///
/// Note that the hoverbox object must have been already generated - for example:
///             $("body").append('<div class="arrowDown" id="hoverBox"><p></p></div>');
///
function segment(qElemNumber, paper, cx, cy, r, rin, startAngle, endAngle, popupText, searchText, columnNumber, params) {

    // Used to caculate radians (used by angle functions) from degrees.  Rad=Deg*pi/180.
    var rad = Math.PI / 180;

    // calculate the start and end positions.  
    // In right angle triangle, (r=hypotenuse) r*cos(angle) = connected side, r*sin(angle) = opposite side
    var x1 = cx + r * Math.cos(-startAngle * rad),
        x2 = cx + r * Math.cos(-endAngle * rad),
        y1 = cy + r * Math.sin(-startAngle * rad),
        y2 = cy + r * Math.sin(-endAngle * rad),
        xx1 = cx + rin * Math.cos(-startAngle * rad),
        xx2 = cx + rin * Math.cos(-endAngle * rad),
        yy1 = cy + rin * Math.sin(-startAngle * rad),
        yy2 = cy + rin * Math.sin(-endAngle * rad);

    // using Raphael, we create a SVG path object that describes the sector we want
    // M = start position, L = line to, A = arc.
    var arc =
     paper.path(["M", xx1, yy1,
                       "L", x1, y1,
                       "A", r, r, 0, +(endAngle - startAngle > 180), 0, x2, y2,
                       "L", xx2, yy2,
                       "A", rin, rin, 0, +(endAngle - startAngle > 180), 1, xx1, yy1, "z"]
                     ).attr(params);

    // If the popupText contains anything, generate a hoverbox that contains the text on mouseover/move
    // popS is a helper function defined below.
    if (popupText.length != 0) {
        arc.mousemove(popS).hover(function () {
            $("#hoverBox p").html(popupText)
        }, function () {
            $("#hoverBox").hide()
        })
    }

	// Make it selectable
	(arc.node.className ? arc.node.className.baseVal = 'selectable' : arc.node.setAttribute('class',  'selectable'));
	arc.node.setAttribute("data-value", qElemNumber);

	
    // That't it, the sector is now created
    return arc;

}
	
/// Shows the popup.  Called by the mouse events over the segments
/// Parameters:
///     e    -    page parameters
///
function popS(e) {
    $("#hoverBox").show();
    var t, n;
    if (e.pageY) {
        t = e.pageY - ($("#hoverBox").height() - 20);
        n = e.pageX + 20
    } else {
        t = e.clientY - ($("#hoverBox").height() - 20);
        n = e.clientX + 20
    }
    $("#hoverBox").offset({
        top: t,
        left: n
    })
}	

/// Formats a number by adding commas for the thousand values
function addCommas(str) {
    var parts = (str + "").split("."),
    main = parts[0],
    len = main.length,
    output = "",
    i = len - 1;

	if(parts.length>1)
		dec = Math.round(parseFloat('0.' + parts[0])*100);
	else
		dec = "00";
	
	
    while (i >= 0) {
        output = main.charAt(i) + output;
        if ((len - i) % 3 === 0 && i > 0) {
            output = "," + output;
        }
        --i;
    }
    // put decimal part back
    if (parts.length > 1) {
        output += "." + dec; //parts[1];
    }
    return output;
}
