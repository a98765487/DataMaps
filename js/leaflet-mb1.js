/**
* Google Choropleth Map
* Loads and displays encoded polygon shapes with data-driven colors.
* By Greg MacWilliam, Threespot.
*/

// JSLint options:
/*global $, google */
/*jslint browser: true, white: true, plusplus: true */

/**
* Generic Map Tooltip
* Follows the cursor while within map bounds, and displays whatever info you give it.
* By Greg MacWilliam, Threespot.
*/
function MapTooltip(frame) {
	var mouseX = -1,
		mouseY = -1,
		active = false,
		dragging = false,
		balloon = $('<div/>').addClass('map-tooltip').appendTo('body').hide(),
		content = $('<div/>').addClass('map-tooltip-content').appendTo(balloon),
		tail = $('<div/>').addClass('map-tooltip-tail').appendTo(balloon),
		html = '';
	
	if (typeof(frame) === 'string') {
		frame = $('#'+frame);
	}	
	
	// Updates the tooltip display with the current mouse coordinates,
	// or defaults to using last set coordinates if called without arguments.
	function update(mx, my) {
		mouseX = (mx || mouseX);
		mouseY = (my || mouseY);
		// Only update tooltip display while active and not dragging.
		if (active && !dragging) {
			// Get half the tail width and full tail height.
			var tw=tail.width()/2,
				th=tail.height(),
				// Get width and height of the box.
				bw=balloon.width(),
				bh=balloon.height(),
				// Calculate container offset and flag if tooltip should push down.
				offset = frame.offset(),
				down = (mouseY-offset.top < bh+th+15),
				// Calculate left and right mouse margins.
				ml=offset.left-mouseX,
				mr=offset.left+frame.width()-mouseX,
				// Calculate box's left offset.
				ol=Math.max(ml-tw, Math.min(-bw/2, mr-bw+tw));

			// Adjust box position.
			balloon.css({
				left:mouseX+ol,
				top:mouseY-(down ? -35 : bh+25)
			});

			// Adjust tail position.
			tail.css({
				backgroundPosition:(down ? '0 0' : '0 bottom'),
				left:-(ol+tw),
				bottom:(down ? bh+1 : -th-1)
			});
		}
	}
	
	// Bind mouse events to map container.
	frame
		.mousedown(function() {
			dragging = true;
			balloon.hide();
		})
		.mouseup(function(evt) {
			dragging = false;
			if (active) {
				balloon.show();
				update(evt.pageX, evt.pageY);
			}
		})
		.mouseout(function() {
			balloon.hide();
			html = '';
		});

	// Return encapsulated interface object.
	return {
		show:function(info, evt) {
			if (!dragging) {
				if (info !== html) {
					html = info;
					content.html(info);
					balloon.show();
				}
				active = true;
				update(evt.pageX, evt.pageY);
			}
		},
		hide:function() {
			if (active) {
				balloon.hide();
				active = false;
				html = '';
			}
		}
	};
}

function MBLeafletMap(containerId, mapUrl) {
	// http://a.tiles.mapbox.com/v3/threespot.j1visa.jsonp
	// http://a.tiles.mapbox.com/v3/threespot.choropleth-test.jsonp
	
	wax.tilejson(mapUrl, function(tilejson) {
		var map = new L.Map('map');
		var tooltip = new MapTooltip($(map._container));
		
		map.setView(new L.LatLng(32, 10), 1);
		map.addLayer(new wax.leaf.connector(tilejson));
		

		wax.leaf.interaction()
			.map(map)
		    .tilejson(tilejson)
		    .on({
				on: function(o) {
					tooltip.show(o.formatter({ format: o.e.type === 'click' ? 'full' : 'teaser' }, o.data), o.e);
				},
				off: function(o) {
					tooltip.hide();
				}
			});
	});
}

MBLeafletMap.prototype = {
	map: null,
	mapData: null,
	mapDataById: null,
	tooltip: null,
	
	onMouseOver: function(evt) {
		var target;
		if (evt.target.id) {
			target = this.mapDataById[ evt.target.id ];
			this.tooltip.show( '<h4>'+ target.label +'</h4><p>Value: '+ target.value +'</p>' );
		}
	},
	
	onMouseOut: function(evt) {
		this.tooltip.hide();
	},
	
	onClick: function(evt) {
		console.log('Click');
	},
};