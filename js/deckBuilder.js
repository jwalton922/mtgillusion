'use strict';

function DeckBuilder($scope, $http, $log) {
    $scope.searchText = "";

    $scope.searchByName = function() {
        var url = "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx?nameFragment=a";
        var params = {};
        params.nameFragment = $scope.searchText;
        params["JSON_CALLBACK"] = "$scope.processSearchResults";

        $http.jsonp(url, {params: params}).success(function(xhr) {
            $log.log("Search results: "+angular.toJson(xhr));
        }

        );
    }
    
    $scope.processSearchResults = function(data){
        $log.log("processing search results: "+angular.toJson(data));
    }
}