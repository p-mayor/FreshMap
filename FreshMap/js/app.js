// Store map and markers to use globally
var map;
var markers = [];

// Data model
var locations = [
    {title: 'Space Needle', location: {lat: 47.6205, lng: -122.3493}},
    {title: 'Uwajimaya', location: {lat: 47.5968569, lng: -122.3271645}},
    {title: 'Fremont Troll', location: {lat: 47.650934, lng: -122.347325}},
    {title: 'Unicorn', location: {lat: 47.614213, lng: -122.3173806}},
    {title: 'Discovery Park', location: {lat: 47.6580719, lng: -122.426235}},
    {title: 'Saltys', location: {lat: 47.5865084, lng: -122.3764632}}
];

// create observables of data model
var Place = function(data) {
	this.title = ko.observable(data.title);
	this.location = ko.observable(data.location);
}

var ViewModel = function() {
	var self = this

	this.placeList = ko.observableArray([]);

    // create a new Place for each item in placeList
	locations.forEach(function(datItem){
		self.placeList.push( new Place(datItem) );
	});	

    // initiate currentPlace observable
	this.currentPlace = ko.observable();

    //this.highlight = function() {
    //    document.getElementById("place").style.color = "yellow";
    //}

	this.setPlace = function(clickedPlace) {
		self.currentPlace(clickedPlace);
        console.log(self.currentPlace.title)
        //self.highlight()
        var wikiStr = clickedPlace.title()
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + wikiStr +
            '&format=json&callback=wikiCallback';
        var $wikiElem = $('#wikipedia-links');
        $wikiElem.text("");

        // start timeout in case of error
        var wikiRequestTimeout = setTimeout(function(){
            $wikiElem.text("failed to get wikipedia resources");
        }, 8000);

        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            jsonp: "callback",
            success: function( response ) {
                var articleList = response[1];

                for (var i = 0; i < articleList.length/2; i++) {
                    articleStr = articleList[i];
                    var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                    $wikiElem.append('<li><a href="' + url + '">' + articleStr + '</a></li>');
                };
                // clear timeout so it doesnt reset the page
                clearTimeout(wikiRequestTimeout);
            }
        });
        return false;
    };
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 47.6063829, lng: -122.3355774},
        zoom: 13,
        mapTypeControl: false
    });
    
    // Create default icon
    var defaultIcon = makeMarkerIcon('0091ff');

    // Create highlight icon
    var highlightedIcon = makeMarkerIcon('FFFF24');

    // Initiliaze the info window
    var largeInfowindow = new google.maps.InfoWindow();

    // iterate through locations to create global markers array
    for (var i = 0; i < locations.length; i++) {
        var position = locations[i].location;
        var title = locations[i].title;
        var marker = new google.maps.Marker({
            position: position,
            title: title,
            animation: google.maps.Animation.DROP,
            icon: defaultIcon,
            id: i,
            });
        
        marker.addListener('mouseover', function() {
            this.setIcon(highlightedIcon);
        });

        marker.addListener('mouseout', function() {
            this.setIcon(defaultIcon);
        });

        marker.addListener('click', function() {
            populateInfoWindow(this, largeInfowindow);
        });

        markers.push(marker);
    }

    showListings();
}

function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21,34));
    return markerImage;
}

function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;

        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });

        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        // In case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        function getStreetView(data, status) {
          if (status == google.maps.StreetViewStatus.OK) {
            var nearStreetViewLocation = data.location.latLng;
            var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
            infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');
            var panoramaOptions = {
                position: nearStreetViewLocation,
                pov: {
                    heading: heading,
                    pitch: 30
                    }
            };
            var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
          } else {
            infowindow.setContent('<div>' + marker.title + '</div>' +
                '<div>No Street View Found</div>');
          }
        }
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
        }
}

// Loop through the markers array and display them all.
function showListings() {
    var bounds = new google.maps.LatLngBounds();
    // Extend the boundaries of the map for each marker and display the marker
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
        bounds.extend(markers[i].position);
    }
    map.fitBounds(bounds);
}

ko.applyBindings(new ViewModel());

