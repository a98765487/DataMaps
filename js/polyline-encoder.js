/*global google */
/*jslint white:true, plusplus:true, vars:true */

/*
* PolylineEncoder
* 
* Based on PolylineEncoder.js by Mark McClure 
* Refined by Greg MacWilliam
* MIT license.
*/
var PolylineEncoder = (function() {
	"use strict";

	var PolylineEncoder = function (numLevels, zoomFactor, verySmall, forceEndpoints) {
		var i;
		
		numLevels = (numLevels || 18);
		zoomFactor = (zoomFactor || 2);
		verySmall = (verySmall || 0.00001);
		forceEndpoints = (forceEndpoints === undefined ? true : false);
		
		this.numLevels = numLevels;
		this.zoomFactor = zoomFactor;
		this.verySmall = verySmall;
		this.forceEndpoints = forceEndpoints;
		this.zoomLevelBreaks = [];
		
		for (i = 0; i < numLevels; i++) {
			this.zoomLevelBreaks.push( verySmall * Math.pow(zoomFactor, numLevels - i - 1) );
		}
	};

	PolylineEncoder.prototype = {
		
		// The main function.  Essentially the Douglas-Peucker
		// algorithm, adapted for encoding. Rather than simply
		// eliminating points, we record their from the
		// segment which occurs at that recursive step.  These
		// distances are then easily converted to zoom levels.
		encode: function (points) {
			var absMaxDist = 0,
				stack = [],
				dists = new Array(points.length),
				maxDist,
				maxLoc,
				temp,
				first,
				last,
				current,
				i,
				segmentLength;

			if (points.length > 2) {
				stack.push([0, points.length - 1]);
				while (stack.length > 0) {
					current = stack.pop();
					maxDist = 0;
					segmentLength = Math.pow(points[current[1]].lat() - points[current[0]].lat(), 2) + Math.pow(points[current[1]].lng() - points[current[0]].lng(), 2);
				
					for (i = current[0] + 1; i < current[1]; i++) {
						temp = this.distance(points[i], points[current[0]], points[current[1]], segmentLength);
						if (temp > maxDist) {
							maxDist = temp;
							maxLoc = i;
							if (maxDist > absMaxDist) {
								absMaxDist = maxDist;
							}
						}
					}
				
					if (maxDist > this.verySmall) {
						dists[maxLoc] = maxDist;
						stack.push([current[0], maxLoc]);
						stack.push([maxLoc, current[1]]);
					}
				}
			}

			return {
				encodedPoints: this.createEncodings(points, dists),
				encodedLevels: this.encodeLevels(points, dists, absMaxDist),
				getPointsLiteral: function() {
					return this.encodedPoints.replace(/\\/g, "\\\\");
				}
			};
		},

		// distance(p0, p1, p2) computes the distance between the point p0
		// and the segment [p1,p2].  This could probably be replaced with
		// something that is a bit more numerically stable.
		distance: function (p0, p1, p2, segLength) {
			var u, out;

			if (p1.lat() === p2.lat() && p1.lng() === p2.lng()) {
				out = Math.sqrt(Math.pow(p2.lat() - p0.lat(), 2) + Math.pow(p2.lng() - p0.lng(), 2));
			} else {
				u = ((p0.lat() - p1.lat()) * (p2.lat() - p1.lat()) + (p0.lng() - p1.lng()) * (p2.lng() - p1.lng())) / segLength;

				if (u <= 0) {
					out = Math.sqrt(Math.pow(p0.lat() - p1.lat(), 2) + Math.pow(p0.lng() - p1.lng(), 2));
				}
				if (u >= 1) {
					out = Math.sqrt(Math.pow(p0.lat() - p2.lat(), 2) + Math.pow(p0.lng() - p2.lng(), 2));
				}
				if (0 < u && u < 1) {
					out = Math.sqrt(Math.pow(p0.lat() - p1.lat() - u * (p2.lat() - p1.lat()), 2) + Math.pow(p0.lng() - p1.lng() - u * (p2.lng() - p1.lng()), 2));
				}
			}
			return out;
		},

		// The createEncodings function is very similar to Google's
		// http://www.google.com/apis/maps/documentation/polyline.js
		// The key difference is that not all points are encoded, 
		// since some were eliminated by Douglas-Peucker.
		createEncodings: function (points, dists) {
			var i,
				dlat,
				dlng,
				plat = 0,
				plng = 0,
				encoded_points = "";

			for (i = 0; i < points.length; i++) {
				if (dists[i] !== undefined || i === 0 || i === points.length - 1) {
					var point = points[i],
						lat = point.lat(),
						lng = point.lng(),
						late5 = Math.floor(lat * 1e5),
						lnge5 = Math.floor(lng * 1e5);
					dlat = late5 - plat;
					dlng = lnge5 - plng;
					plat = late5;
					plng = lnge5;
					encoded_points += this.encodeSignedNumber(dlat) + this.encodeSignedNumber(dlng);
				}
			}
			return encoded_points;
		},

		// This computes the appropriate zoom level of a point in terms of it's 
		// distance from the relevant segment in the DP algorithm.  Could be done
		// in terms of a logarithm, but this approach makes it a bit easier to
		// ensure that the level is not too large.
		computeLevel: function (dd) {
			var lev = 0;
			if (dd > this.verySmall) {
				while (dd < this.zoomLevelBreaks[lev]) {
					lev++;
				}
			}
			return lev;
		},

		// Now we can use the previous function to march down the list
		// of points and encode the levels.  Like createEncodings, we
		// ignore points whose distance (in dists) is undefined.
		encodeLevels: function (points, dists, absMaxDist) {
			var encoded_levels = "",
				i;

			if (this.forceEndpoints) {
				encoded_levels += this.encodeNumber( this.numLevels - 1 );
			} else {
				encoded_levels += this.encodeNumber( this.numLevels - this.computeLevel(absMaxDist) - 1 );
			}
		
			for (i = 1; i < points.length - 1; i++) {
				if (dists[i] !== undefined) {
					encoded_levels += this.encodeNumber( this.numLevels - this.computeLevel(dists[i]) - 1 );
				}
			}
		
			if (this.forceEndpoints) {
				encoded_levels += this.encodeNumber( this.numLevels - 1 );
			} else {
				encoded_levels += this.encodeNumber( this.numLevels - this.computeLevel(absMaxDist) - 1 );
			}
		
			return encoded_levels;
		},

		// This function is very similar to Google's, but I added
		// some stuff to deal with the double slash issue.
		encodeNumber: function (num) {
			var encodeString = "",
				nextValue,
				finalValue;
			
			while (num >= 0x20) {
				nextValue = (0x20 | (num & 0x1f)) + 63;
				//     if (nextValue == 92) {
				//       encodeString += (String.fromCharCode(nextValue));
				//     }
				encodeString += (String.fromCharCode(nextValue));
				num >>= 5;
			}
			finalValue = num + 63;
			//   if (finalValue == 92) {
			//     encodeString += (String.fromCharCode(finalValue));
			//   }
			encodeString += (String.fromCharCode(finalValue));
			return encodeString;
		},

		// This one is Google's verbatim.
		encodeSignedNumber: function (num) {
			var sgn_num = num << 1;
			if (num < 0) {
				sgn_num = ~ (sgn_num);
			}
			return this.encodeNumber(sgn_num);
		}
	};

	// The remaining code defines a few convenience utilities.
	// PolylineEncoder.LatLng
	PolylineEncoder.LatLng = function (y, x) {
		this.y = y;
		this.x = x;
	};
	PolylineEncoder.LatLng.prototype = {
		lat: function () {
			return this.y;
		},
		lng: function () {
			return this.x;
		}
	};
	
	// Utility for abstracting the creation of LatLng objects.
	// May be overwritten by adaptors to construct lib-specific object types.
	PolylineEncoder.getLatLng = function(y, x) {
		return new PolylineEncoder.LatLng(y, x);
	};
	
	// PolylineEncoder.pointsToLatLngs
	PolylineEncoder.pointsToLatLngs = function (points) {
		var i, latLngs;
		latLngs = [];
		for (i = 0; i < points.length; i++) {
			latLngs.push(PolylineEncoder.getLatLng(points[i][0], points[i][1]));
		}
		return latLngs;
	};
	
	// This function is from Google's polyline utility.
	PolylineEncoder.decode = function(encoded) {
		var len = encoded.length,
			index = 0,
			array = [],
			lat = 0,
			lng = 0;

		while (index < len) {
			var b,
				shift = 0,
				result = 0;
			do {
				b = encoded.charCodeAt(index++) - 63;
				result |= (b & 0x1f) << shift;
				shift += 5;
			} while (b >= 0x20);
			var dlat = ((result & 1) ? ~ (result >> 1) : (result >> 1));
			lat += dlat;

			shift = 0;
			result = 0;
			do {
				b = encoded.charCodeAt(index++) - 63;
				result |= (b & 0x1f) << shift;
				shift += 5;
			} while (b >= 0x20);
			var dlng = ((result & 1) ? ~ (result >> 1) : (result >> 1));
			lng += dlng;

			array.push([lat * 1e-5, lng * 1e-5]);
		}

		return array;
	};
	
	return PolylineEncoder;
}());

/**
* Google-specific utility methods.
*/
(function(PolylineEncoder) {
	"use strict";
	
	PolylineEncoder.getLatLng = function(y, x) {
		return new google.maps.LatLng(y, x);
	};
	
	PolylineEncoder.prototype.encodeToPolyline = function (points, color, weight, opacity) {
		return new google.maps.Polyline({
			path: points,
			strokeColor: (color || '#f00'),
			strokeWeight: (weight || 2),
			strokeOpacity: (opacity || 0.9)
		});
	};
	
	PolylineEncoder.prototype.encodeToPolygon = function (points, color, weight, opacity) {
		return new google.maps.Polygon({
			paths: points,
			fillColor: (color || '#f00'),
			fillOpacity: (opacity || 0.75),
			strokeColor: (color || '#f00'),
			strokeWeight: (weight || 2),
			strokeOpacity: (opacity || 0.9)
		});
	};
	
	// PolylineEncoder.pointsToGLatLngs
	PolylineEncoder.pointsToLatLngs = function (points) {
		var i, gLatLngs;
		gLatLngs = [];
		for (i = 0; i < points.length; i++) {
			gLatLngs.push(new google.maps.LatLng(points[i][0], points[i][1]));
		}
		return gLatLngs;
	};

}(PolylineEncoder));