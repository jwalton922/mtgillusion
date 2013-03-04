'use strict';

function DeckBuilder($scope, $http, $log) {
    $scope.searchText = "";

    $scope.searchByName = function() {
        var url = "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx?nameFragment=a";
        var params = {};
        params.nameFragment = $scope.searchText;

        $http.get(url, {params: params}).success(function(xhr) {
            $log.log("Search results: "+angular.toJson(xhr));
        }

        );
    }
}