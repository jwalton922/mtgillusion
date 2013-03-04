'use strict';

function DeckBuilder($scope, $http, $log) {
    $scope.searchText = "";
    $scope.searchResults = [];
    $scope.deck = [];
    
    $scope.searchByName = function() {

        var url = "/search";
        var params = {};
        params.nameFragment = $scope.searchText;
        params.dataType = "json";

        $http.get(url, {params: params}).success(function(xhr) {
            $log.log("Search results: " + angular.toJson(xhr));
            $scope.searchResults = [];
            var results = xhr.Results
            for (var i = 0; i < results.length; i++) {
                var searchResult = {};
                searchResult.name = results[i].Name;
                $scope.searchResults.push(searchResult);
            }
        });

    }
    
    $scope.addToDeck = function(result){
        var deckObj = {};
        deckObj.name = result.name;
        deckObj.quantity = result.quantity;
        $scope.deck.push(deckObj);
    }
    
    $scope.viewCard = function(searchResult){
        $log.log("View card called on: "+angular.toJson(searchResult));
        var cardName = searchResult.name.toUpperCase();
        while(cardName.indexOf(" ") > 0){
            cardName = cardName.replace(" ","_");
        }
        cardName+=".jpg";
        $log.log("viewing card: "+cardName);
        $scope.cardToView = "/mtgImages/"+cardName;
    }

}