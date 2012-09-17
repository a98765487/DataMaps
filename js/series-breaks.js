/*jslint vars:true */

/**
* Implementation based on GeoStats.js
* recode by Greg MacWilliam, Threespot.
*/
var SeriesBreaks = (function() {
	"use strict";
	
	var ArrayUtils = {
		min: function(a) {
			return Math.min.apply(Math, a);
		},
		max: function(a) {
			return Math.max.apply(Math, a);
		},
		mean: function(a) {
			var t = 0,
				l = a.length,
				i;

			for (i = 0; i < l; i++) {
				t += a[i];
			}
			return t / l;
		},
		sort: function(a) {
			return a.sort(function(b, c) { return b - c; });
		},
		indexOf: function(needle, haystack) {
			var i;

			for (i in haystack) {
				if (haystack.hasOwnProperty(i) && haystack[i] === needle) {
					return i;
				}
			}

			return false;
		}
	};
	
	var NBUtils = {
		getClass: function(indVal, nbClass, classCounterTab) {
			
			var rgMin = 0,
				rgMax = classCounterTab[0]-1,
				indClass,
				i;

			for(i = 0; i < nbClass; i++){
				if ( (indVal>=rgMin) && (indVal<=rgMax) ) {			
					indClass = i;
				}

				// mise a jour des rangs min et max
				rgMin = rgMin + classCounterTab[i];
				rgMax = rgMin + classCounterTab[i+1] -1;
			}

			return indClass;
		},
		getBounds: function(values, classCounter) {

			values = ArrayUtils.sort(values);

			var len = values.length,
				nbClass = classCounter.length,
				listBounds = [],
				indBounds = 0,
				i;

			for(i = 0; i < nbClass; i++){
				listBounds[i] = values[indBounds];
				indBounds = indBounds + classCounter[i];
			}

			listBounds[nbClass] = values[len-1];

			return listBounds;
		}
	};

	return {
		/*
		* Returns equally-sized classes distributed evenly across the range of series values.
		*/
		equalInterval: function(series, numClasses) {
			var breaks = [],
				low = ArrayUtils.min(series),
				interval = (ArrayUtils.max(series) - low) / numClasses,
				i;

			for (i = 0; i <= numClasses; i++) {
				breaks.push(low);
				low += interval;
			}

			return breaks;
		},
		
		/*
		* Returns unevenly-sized classes distributed at even intervals across the series of values.
		*/
		quantile: function(series, numClasses) {
			series = ArrayUtils.sort(series);
			
			var breaks = [],
				classSize = Math.round(series.length / numClasses),
				j = classSize,
				i;

			// set first value.
			breaks.push( series[0] );

			for (i = 1; i < numClasses; i++) {
				breaks.push( series[j] );
				j += classSize;
			}
			
			// set last value.
			breaks.push( series[series.length-1] );
			
			return breaks;
		},
		
		/*
		* Returns unevenly-sized classes distributed at at uneven intervals across the series of values.
		* Breaks are distributed around concentrations of values within the series.
		*/
		jenks: function(series, numClasses) {
			series = ArrayUtils.sort(series);
		
			var seriesCount = series.length,
				classSize = Math.round(seriesCount / numClasses),
				classCounter = [],
				classAverage = [],
				variation = true,
				distanceAverages = [],
				val,
				min,
				max,
				minIndex,
				valIndex,
				i,
				j;
				
			// Define classe sizes.
			for (i = 0; i < numClasses-1; i++) {
				classCounter.push(classSize);
			}
			
			// Add remainder as outer boundaries.
			classCounter.push(seriesCount - (numClasses-1) * classSize);

			while (variation) {
				// reset variation.
				variation = false;
 				min = 0;

				// calculating averages for each class
				for (i = 0; i < numClasses; i++) {
					val = classCounter[i];
					max = min + val;
					classAverage[i] = ArrayUtils.mean( series.slice(min, max) );
					min = max;
				}

				distanceAverages.length = 0;

				for (j = 0; j < seriesCount; j++) {

					val = series[j];

					// calculate distance averages
					for (i = 0; i < numClasses; i++) {
						distanceAverages[i] = Math.pow(classAverage[i] - val, 2);
					}

					min = ArrayUtils.min(distanceAverages);
					minIndex = parseInt(ArrayUtils.indexOf(min, distanceAverages), 10);
					valIndex = NBUtils.getClass(j, numClasses, classCounter);
					
					if (minIndex !== valIndex) {
						classCounter[minIndex]++;
						classCounter[valIndex]--;
						variation = true;
					}
				}
			}
			
			return NBUtils.getBounds(series, classCounter);
		}
	};
}());