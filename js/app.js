// create data model objects
var Place = function(data) {
	this.title = data.title;
	this.location = data.location;
    this.id = data.id;
    this.match = ko.observable(true); //used in filterList function
    this.selected = ko.observable(false); //used in setPlace function
};

var viewModel = function() {
	var self = this;
    var map;
    var markers = [];

    // initiliaze google map
    initMap = function() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 47.6063829, lng: -122.3355774},
            zoom: 13,
            mapTypeControl: false
        });
        
        // Create the DIV to hold the control and call the CenterControl()
        // constructor passing in this DIV.
        var sideControlDiv = document.createElement('div');
        var sideControl = new SideControl(sideControlDiv, map);

        // add button to open sidebar to map
        sideControlDiv.index = 1;
        map.controls[google.maps.ControlPosition.LEFT_CENTER].push(sideControlDiv);

        // Create icons
        defaultIcon = makeMarkerIcon('0091ff');
        highlightedIcon = makeMarkerIcon('FFFF24');

        // Initiliaze the info window
        largeInfowindow = new google.maps.InfoWindow();

        // iterate through locations to create markers array
        for (var i = 0; i < locations.length; i++) {
            var position = locations[i].location;
            var title = locations[i].title;
            var marker = new google.maps.Marker({
                position: position,
                title: title,
                animation: google.maps.Animation.DROP,
                icon: defaultIcon,
                id: locations[i].id,
                });
            marker.addListener('click', function() {
                for (var i = 0; i < markers.length; i++) {
                    markers[i].setIcon(defaultIcon);
                }
                self.setPlace(self.placeList()[this.id]);
                populateInfoWindow(this, largeInfowindow);
                this.setIcon(highlightedIcon);
            });
            markers.push(marker);
        }

        var bounds = new google.maps.LatLngBounds();

        // Extend the boundaries of the map for each marker and display the marker
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(map);
            bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
        
        google.maps.event.addDomListener(window, 'resize', function() {
            map.fitBounds(bounds); // `bounds` is a `LatLngBounds` object
        });
    };

    googleError = function() {
        window.alert("google maps API failed to load")
    }

    populateInfoWindow = function(marker, infowindow) {
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow.marker != marker) {
            // Clear the infowindow content to give the streetview time to load.
            infowindow.setContent('');
            infowindow.marker = marker;

            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
                marker.setIcon(defaultIcon);
            });

            var streetViewService = new google.maps.StreetViewService();
            var radius = 50;

            // In case the status is OK, which means the pano was found, compute the
            // position of the streetview image, then calculate the heading, then get a
            // panorama from that and set the options
            getStreetView = function(data, status) {
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
            };
            // Use streetview service to get the closest streetview image within
            // 50 meters of the markers position
            streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
            // Open the infowindow on the correct marker.
            infowindow.open(map, marker);
        }
    };

    makeMarkerIcon = function(markerColor) {
        var markerImage = new google.maps.MarkerImage(
            'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
            '|40|_|%E2%80%A2',
            new google.maps.Size(21, 34),
            new google.maps.Point(0, 0),
            new google.maps.Point(10, 34),
            new google.maps.Size(21,34));
        return markerImage;
    };

    this.sideBarOpen = ko.observable(false)
    // create button to open sidebar
    SideControl = function(controlDiv, map) {
        // Set CSS for the control border.
        var controlUI = document.createElement('div');
        controlUI.style.backgroundColor = '#fff';
        controlUI.style.border = '2px solid #fff';
        controlUI.style.borderRadius = '3px';
        controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
        controlUI.style.cursor = 'pointer';
        controlUI.style.marginBottom = '22px';
        controlUI.style.textAlign = 'center';
        controlUI.title = 'Click to open the sidebar';
        controlDiv.appendChild(controlUI);

        // Set CSS for the control interior.
        var controlText = document.createElement('div');
        controlText.style.color = 'rgb(25,25,25)';
        controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
        controlText.style.fontSize = '16px';
        controlText.style.lineHeight = '38px';
        controlText.style.paddingLeft = '5px';
        controlText.style.paddingRight = '5px';
        controlText.innerHTML = 'Open Sidebar';
        controlUI.appendChild(controlText);

        controlUI.addEventListener('click', function() {
            self.sideBarOpen(true)
        });
    };

    closeNav = function() {
        self.sideBarOpen(false)
    };

	this.placeList = ko.observableArray([]);

    // create a new Place from each item and add to placeList
	locations.forEach(function(datItem){
		self.placeList.push( new Place(datItem) );
	});	

	this.currentPlace = ko.observable();

    // update current place when a place is clicked
	this.setPlace = function(clickedPlace) {
        // prevent multiple clicks on same place
        if (clickedPlace != self.currentPlace()) {
            if (self.currentPlace()) {
                markers[self.currentPlace().id].setIcon(defaultIcon);
                self.currentPlace().selected(false);
            }
            self.currentPlace(clickedPlace);
            if (self.currentPlace()) {
                self.currentPlace().selected(true);
                self.loadData(clickedPlace);
                m = markers[self.currentPlace().id];
                populateInfoWindow(m, largeInfowindow);
                m.setIcon(highlightedIcon);
            }

        }
    };

    this.wikiArr = ko.observableArray([{wikiStr:"Select a place"}]);
    this.nytArr = ko.observableArray([{nytStr:"Select a place"}]);

    // load wiki and NYT API data
    this.loadData = function(clickedPlace) {
        var searchStr = clickedPlace.title;
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + searchStr +
            '&format=json&callback=wikiCallback';
        this.wikiArr([])

        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            jsonp: "callback",
        }).done(function( response ) {
            var articleList = response[1];
            for (var i = 0; i < articleList.length/2; i++) {
                articleStr = articleList[i];
                var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                self.wikiArr.push({wikiStr:'<li><a href="' + url + '">' + articleStr + '</a></li>'});
            }
        }).fail(function(jqXHR, textStatus) {
            self.wikiArr.push({nytStr:'New York Times Articles Could Not Be Loaded'});
        })
        

        // load nytimes
        this.nytArr([])

        var nytimesUrl = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=' +
            searchStr + '&sort=newest&api-key=bdd041098e804a6781c9e0b7079fa316';
        $.getJSON(nytimesUrl, function(data){
            articles = data.response.docs;
            status = data.response.status;
            if (status == "error") {
                console.log("error");
            }
            for (var i = 0; i < articles.length; i++) {
                var article = articles[i];
                self.nytArr.push({nytStr:'<li class="article">'+
                    '<a href="'+article.web_url+'">'+article.headline.main+'</a>'+
                    '<p>' + article.snippet + '</p>'+
                    '</li>'});
            }
        }).fail(function(e){
            self.nytArr.push({nytStr:'New York Times Articles Could Not Be Loaded'});
        });
        return false;
    };

    // filter places
    this.query = ko.observable('');

    this.filterList = function(value) {
        li = self.placeList();
        for (i = 0; i < li.length; i++) {
            if(li[i].title.toLowerCase().indexOf(value.toLowerCase()) > -1) {
                self.placeList()[i].match(true);
            } else {
                self.placeList()[i].match(false);
            }
        }
    };

    this.query.subscribe(this.filterList)
};

//viewModel().query.subscribe(viewModel().filterList);
ko.applyBindings(new viewModel());

