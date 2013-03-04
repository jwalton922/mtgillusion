'use strict';

function DeckBuilder($scope, $http, $log) {
    $scope.searchText = "";
    $scope.searchResults = [];
    $scope.deck = {};
    $scope.deck.cards = [];
    
    $scope.removeFromDeck = function(card){
        var indexToRemove = -1;
        for(var i = 0; i < $scope.deck.length; i++){
            if(card.name === $scope.deck[i].name){
                indexToRemove = i;
            }
        }
        
        if(indexToRemove >= 0){
            $scope.deck.cards.splice(indexToRemove, 1);
        }
    }
    
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
                searchResult.quantity = 1;
                $scope.searchResults.push(searchResult);
                
            }
        });

    }
    
    $scope.addToDeck = function(result){
        var deckObj = {};
        deckObj.name = result.name;
        deckObj.quantity = result.quantity;
        $scope.deck.cards.push(deckObj);
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
    
    $scope.saveDeck = function(){
        $http.post("/deck/create", {data: $scope.deck}).success(function(xhr){
            $log.log("success creating deck: "+angular.toJson(xhr));
        }).error(function(xhr){
           $log.log("error creating deck: "+angular.toJson(xhr)); 
        });
    }

}