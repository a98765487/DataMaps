/**
* Google Choropleth Map
* Loads and displays encoded polygon shapes with data-driven colors.
* By Greg MacWilliam, Threespot.
*/

// JSLint options:
/*global $, google */
/*jslint browser: true, white: true, plusplus: true */

function GoogleChoroplethMap(containerId) {
	this.map = new google.maps.Map(document.getElementById(containerId), {
		maxZoom:4,
	    minZoom:1,
	    zoom:1,
	    center:new google.maps.LatLng(32, 10),
	    scrollwheel:false,
		panControl:false,
	    mapTypeControl:false,
	    streetViewControl:false,
	    zoomControlOptions: {
	        position:google.maps.ControlPosition.LEFT_TOP,
			style:google.maps.ZoomControlStyle.LARGE
	    }
	});

	// Create map styles.
	this.map.mapTypes.set('clean', new google.maps.StyledMapType([{
	    stylers: [
			{hue:"#ffcc00"},
			{saturation:-99},
			{gamma:0.52}
		]}, {
		stylers: [
			{visibility:"off"}
		]}, {
	    featureType:"water",
	    stylers: [
			{visibility:"simplified"},
			{hue:"#ff0000"},
			{lightness: 99}
		]}, {
	    featureType:"administrative.country",
	    elementType:"geometry",
	    stylers: [
			{visibility:"on"},
			{invert_lightness:true},
			{lightness:95},
			{gamma:0.55}
		]
	}]));

	this.map.setMapTypeId('clean');
}

GoogleChoroplethMap.prototype = {
	map: null,
	mapData: null,
	tooltip: null,
	
	// Gets a color for a specific value.
	getColorForValue: function(value) {
		if (!isNaN(parseFloat(value)) && isFinite(value)) {
			if (value <= 20) {
				return "#aed0da";
			} else if (value <= 40) {
				return "#68c2e7";
			} else if (value <= 60) {
				return "#00a9df";
			} else if (value <= 80) {
				return "#00719f";
			} else if (value <= 100) {
				return "#003060";
			}
		}
		return "#ccc";
	},
	
	// Re-renders the map display.
	renderMap: function() {
		if (this.mapData) {
			var geo,
				i;
				
			for (i in this.mapData) {
				if (this.mapData.hasOwnProperty(i)) {
					geo = this.mapData[i];
					geo.value = Math.round(100*Math.random()); // << Reassign value. Pull this number for your data source.
					geo.enabled = (geo.value > -1);
					geo.shape.setOptions({
						fillColor: this.getColorForValue( geo.value ),
						fillOpacity: (geo.enabled ? 0.75 : 0),
						clickable: geo.enabled
					});
				}
			}
		
		}
	},
	
	// Adds a polygon to the map instance.
	addPolygon: function(geo) {
		var self = this,
			i;
	
		// Decode polygon data, replacing encoded data with decoded data.
		for (i=geo.shape.length-1; i >= 0; i--) {
	        geo.shape[i] = google.maps.geometry.encoding.decodePath(geo.shape[i]);
	    }
	
		// Create new map polygon.
		geo.shape = new google.maps.Polygon({
			paths: geo.shape,
			zoomFactor: 1,
			numLevels: 5,
			strokeColor: "#FFFFFF",
			strokeOpacity: 1.0,
			strokeWeight: 0.1,
			fillColor: this.getColorForValue( geo.value ),
			fillOpacity: 0.5
		});
		
		if (this.tooltip) {
			// Attach MouseOver behavior.
		    google.maps.event.addListener(geo.shape, 'mouseover', function() {
				if (geo.enabled) {
					self.tooltip.show( '<h4>'+ geo.label +'</h4><p>Value: '+ geo.value +'</p>' );
				}
		    });

		    // Attach MouseOut behavior.
		    google.maps.event.addListener(geo.shape, 'mouseout', function() {
				self.tooltip.hide();
		    });
		}

		// Attach polygon to map.
		geo.shape.setMap(this.map);
	},
	
	// Clears all shapes from the map.
	clearMap: function() {
		var geo;
		if (this.mapData) {
			while (this.mapData.length > 0) {
				geo = this.mapData.pop();
				geo.shape.unbindAll();
				geo.shape.setMap(null);
				geo.shape = null;
				geo = null;
			}
			this.mapData = null;
		}
	},

	// Loads a new polygon set into the map.
	loadMap: function(url) {
		var self = this;
		this.clearMap();
	
		$.ajax({
			url: url,
			dataType: 'json',
	        success: function(data) {
				var geo,
					i;

				for (i=data.length-1; i >= 0; i--) {
			        geo = data[i];
					geo.value = Math.round(100*Math.random()); // << Assign a value. Pull this number for your data source.
					geo.enabled = true;
					self.addPolygon(geo);
			    }
			
				self.mapData = data;
				self = null;
			}
		});
	}
};