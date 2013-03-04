'use strict';

function DeckBuilder($scope, $http, $log) {
    $scope.searchText = "";
    $scope.searchResults = [];
    $scope.searchByName = function() {
        var url = "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx";
        var params = {};
        params.nameFragment = $scope.searchText;
        params["JSON_CALLBACK"] = "$scope.processSearchResults";
        params.dataType = "json";

        $http.jsonp(url, {params: params}).success(function(xhr) {
            $log.log("Search results: "+angular.toJson(xhr));
        }

        );
    }
    
    $scope.processSearchResults = function(data){
        var dataParsed = JSON.parse(data);
        $log.log("processing search results: "+angular.toJson(dataParsed));
        var results = dataParsed.Results;
        for(var i = 0; i < results.length; i++){
            var searchObject = {};
            searchObject.name = results[i].Name;
        }
    }
}